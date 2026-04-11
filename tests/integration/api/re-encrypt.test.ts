import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { randomBytes } from "crypto";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { createChannel, createMedia } from "../../helpers/factories";
import MediaProduct from "@/models/MediaProduct";
import { encryptSourceUrl, decryptSourceUrl } from "@/lib/content-encryption";

function generateProductKey(): string {
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Mock auth — require owner
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock connectDB
vi.mock("@/lib/mongodb", () => ({
  connectDB: vi.fn().mockImplementation(async () => mongoose),
}));

// Mock satsrail client
const mockGetProduct = vi.fn();
const mockGetProductKey = vi.fn();
const mockClearOldKey = vi.fn();

vi.mock("@/lib/satsrail", () => ({
  satsrail: {
    getProduct: (...args: unknown[]) => mockGetProduct(...args),
    getProductKey: (...args: unknown[]) => mockGetProductKey(...args),
    clearOldKey: (...args: unknown[]) => mockClearOldKey(...args),
  },
}));

// Mock getMerchantKey
vi.mock("@/lib/merchant-key", () => ({
  getMerchantKey: vi.fn().mockResolvedValue("sk_live_test_merchant_key"),
}));

import { POST } from "@/app/api/admin/products/[id]/re-encrypt/route";

async function readStream(response: Response): Promise<string[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const lines: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const chunkLines = chunk.split("\n").filter(Boolean);
    lines.push(...chunkLines);
  }

  return lines;
}

function createReEncryptRequest(productId: string): NextRequest {
  return new NextRequest(
    new URL(`http://localhost:3000/api/admin/products/${productId}/re-encrypt`),
    { method: "POST" }
  );
}

describe("POST /api/admin/products/[id]/re-encrypt", () => {
  const oldKey = generateProductKey();
  const newKey = generateProductKey();
  const productId = "prod_test_rotation";

  beforeAll(async () => {
    await setupTestDB();
    // Set up owner session
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", name: "Admin", type: "admin", role: "owner" },
    });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
    vi.clearAllMocks();
    // Restore owner session after each test
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", name: "Admin", type: "admin", role: "owner" },
    });
  });

  it("re-encrypts all media products from old key to new key", async () => {
    const channel = await createChannel();
    const urls = [
      "https://cdn.example.com/video1.mp4",
      "https://cdn.example.com/video2.mp4",
      "https://cdn.example.com/video3.mp4",
    ];

    // Create media products encrypted with old key
    for (let i = 0; i < urls.length; i++) {
      const media = await createMedia(channel._id.toString(), {
        name: `Video ${i}`,
        source_url: urls[i],
      });
      await MediaProduct.create({
        media_id: media._id,
        satsrail_product_id: productId,
        encrypted_source_url: encryptSourceUrl(urls[i], oldKey, productId),
      });
    }

    // Mock SatsRail responses
    mockGetProduct.mockResolvedValue({ id: productId, old_key: oldKey });
    mockGetProductKey.mockResolvedValue({ key: newKey, key_fingerprint: "new_fp" });
    mockClearOldKey.mockResolvedValue({});

    const req = createReEncryptRequest(productId);
    const res = await POST(req, { params: Promise.resolve({ id: productId }) });

    expect(res.status).toBe(200);

    // Read streaming response
    const lines = await readStream(res);
    const events = lines.map((l) => JSON.parse(l));

    // Should have 3 progress events + 1 done event
    expect(events).toHaveLength(4);
    expect(events[0]).toEqual({ current: 1, total: 3, errors: 0 });
    expect(events[1]).toEqual({ current: 2, total: 3, errors: 0 });
    expect(events[2]).toEqual({ current: 3, total: 3, errors: 0 });
    expect(events[3]).toEqual({ done: true, total: 3, errors: 0 });

    // Verify all blobs were re-encrypted with new key
    const mediaProducts = await MediaProduct.find({ satsrail_product_id: productId });
    for (let i = 0; i < mediaProducts.length; i++) {
      const decrypted = decryptSourceUrl(mediaProducts[i].encrypted_source_url, newKey, productId);
      expect(urls).toContain(decrypted);
    }

    // old_key should have been cleared
    expect(mockClearOldKey).toHaveBeenCalledWith("sk_live_test_merchant_key", productId);
  });

  it("returns 400 when no key rotation is pending", async () => {
    mockGetProduct.mockResolvedValue({ id: productId, old_key: null });

    const req = createReEncryptRequest(productId);
    const res = await POST(req, { params: Promise.resolve({ id: productId }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No key rotation pending");
  });

  it("returns 401 when not authenticated as owner", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createReEncryptRequest(productId);
    const res = await POST(req, { params: Promise.resolve({ id: productId }) });

    expect(res.status).toBe(401);
  });

  it("returns 403 when admin but not owner", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-2", email: "mgr@test.com", name: "Manager", type: "admin", role: "admin" },
    });

    const req = createReEncryptRequest(productId);
    const res = await POST(req, { params: Promise.resolve({ id: productId }) });

    expect(res.status).toBe(403);
  });

  it("clears old_key immediately when no media products exist", async () => {
    mockGetProduct.mockResolvedValue({ id: productId, old_key: oldKey });
    mockGetProductKey.mockResolvedValue({ key: newKey, key_fingerprint: "fp" });
    mockClearOldKey.mockResolvedValue({});

    const req = createReEncryptRequest(productId);
    const res = await POST(req, { params: Promise.resolve({ id: productId }) });

    const body = await res.json();
    expect(body).toEqual({ done: true, total: 0, errors: 0 });
    expect(mockClearOldKey).toHaveBeenCalledWith("sk_live_test_merchant_key", productId);
  });

  it("does NOT clear old_key when re-encryption has errors", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());

    // Create a media product with a CORRUPTED encrypted blob
    await MediaProduct.create({
      media_id: media._id,
      satsrail_product_id: productId,
      encrypted_source_url: "corrupted-not-base64-at-all!!!",
    });

    mockGetProduct.mockResolvedValue({ id: productId, old_key: oldKey });
    mockGetProductKey.mockResolvedValue({ key: newKey, key_fingerprint: "fp" });

    const req = createReEncryptRequest(productId);
    const res = await POST(req, { params: Promise.resolve({ id: productId }) });

    const lines = await readStream(res);
    const events = lines.map((l) => JSON.parse(l));

    // Progress event should show 1 error
    const progressEvent = events.find((e: { current?: number }) => e.current === 1);
    expect(progressEvent.errors).toBe(1);

    // Done event should show errors > 0
    const doneEvent = events.find((e: { done?: boolean }) => e.done);
    expect(doneEvent.errors).toBeGreaterThan(0);

    // old_key should NOT have been cleared
    expect(mockClearOldKey).not.toHaveBeenCalled();
  });

  it("returns 502 when SatsRail getProduct fails", async () => {
    mockGetProduct.mockRejectedValue(new Error("SatsRail API unavailable"));

    const req = createReEncryptRequest(productId);
    const res = await POST(req, { params: Promise.resolve({ id: productId }) });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("SatsRail API unavailable");
  });

  it("returns 502 when SatsRail getProductKey fails", async () => {
    mockGetProduct.mockResolvedValue({ id: productId, old_key: oldKey });
    mockGetProductKey.mockRejectedValue(new Error("Key service down"));

    const req = createReEncryptRequest(productId);
    const res = await POST(req, { params: Promise.resolve({ id: productId }) });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("Key service down");
  });

  it("returns 422 when merchant key is not configured", async () => {
    const { getMerchantKey } = await import("@/lib/merchant-key");
    (getMerchantKey as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const req = createReEncryptRequest(productId);
    const res = await POST(req, { params: Promise.resolve({ id: productId }) });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain("Merchant API key not configured");
  });
});
