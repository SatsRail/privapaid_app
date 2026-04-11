import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";

const { mockGetMerchantKey, mockSatsrailClient } = vi.hoisted(() => ({
  mockGetMerchantKey: vi.fn().mockResolvedValue("sk_test_key"),
  mockSatsrailClient: {
    createProduct: vi.fn(),
    getProductKey: vi.fn(),
  },
}));

// Mocks — MUST be before route imports
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" })),
}));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn().mockImplementation(async () => mongoose) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/auth-helpers", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "owner" }),
  requireOwnerApi: vi.fn().mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "owner" }),
  requireCustomerApi: vi.fn().mockResolvedValue({ id: "customer-1", name: "testuser" }),
}));
vi.mock("@/lib/satsrail", () => ({ satsrail: mockSatsrailClient }));
vi.mock("@/lib/merchant-key", () => ({ getMerchantKey: mockGetMerchantKey }));

vi.mock("@/lib/content-encryption", () => ({
  encryptSourceUrl: vi.fn().mockReturnValue("encrypted_blob_123"),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/channels/[id]/create-product/route";
import { createChannel, createMedia } from "../../helpers/factories";

function buildRequest(
  channelId: string,
  body: unknown
): [NextRequest, { params: Promise<{ id: string }> }] {
  const url = `http://localhost:3000/api/admin/channels/${channelId}/create-product`;
  return [
    new NextRequest(new URL(url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: channelId }) },
  ];
}

describe("Admin Channel Create Product", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
    vi.clearAllMocks();
    mockGetMerchantKey.mockResolvedValue("sk_test_key");
  });

  it("creates a channel product and encrypts media", async () => {
    const channel = await createChannel({
      name: "Test Channel",
      slug: "test-ch",
      satsrail_product_type_id: "pt_123",
    });
    await createMedia(channel._id.toString(), { source_url: "https://example.com/v1.mp4" });
    await createMedia(channel._id.toString(), { source_url: "https://example.com/v2.mp4" });

    mockSatsrailClient.createProduct.mockResolvedValue({
      id: "prod_1",
      name: "Channel Access",
      price_cents: 1000,
      slug: "channel-access",
    });
    mockSatsrailClient.getProductKey.mockResolvedValue({
      key: "base64key",
      key_fingerprint: "fp_abc",
    });

    const [req, ctx] = buildRequest(channel._id.toString(), {
      name: "Channel Access",
      price_cents: 1000,
      currency: "USD",
    });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.channel_product.satsrail_product_id).toBe("prod_1");
    expect(body.data.channel_product.encrypted_media_count).toBe(2);
    expect(body.data.product.name).toBe("Channel Access");
    expect(body.data.product.slug).toBe("channel-access");
  });

  it("returns 422 when name is missing", async () => {
    const channel = await createChannel({ slug: "no-name" });
    const [req, ctx] = buildRequest(channel._id.toString(), { price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("name and price_cents are required");
  });

  it("returns 422 when price_cents is missing", async () => {
    const channel = await createChannel({ slug: "no-price" });
    const [req, ctx] = buildRequest(channel._id.toString(), { name: "Test" });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("name and price_cents are required");
  });

  it("returns 404 when channel not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const [req, ctx] = buildRequest(fakeId, { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Channel not found");
  });

  it("returns 422 when channel has no product type", async () => {
    const channel = await createChannel({ slug: "no-pt", satsrail_product_type_id: null });
    const [req, ctx] = buildRequest(channel._id.toString(), { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("no SatsRail product type");
  });

  it("returns 422 when channel has no ref", async () => {
    const channel = await createChannel({ slug: "no-ref", ref: null, satsrail_product_type_id: "pt_1" });
    const [req, ctx] = buildRequest(channel._id.toString(), { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("Channel has no ref assigned");
  });

  it("returns 422 when merchant key not configured", async () => {
    mockGetMerchantKey.mockResolvedValue(null);
    const channel = await createChannel({ slug: "no-key", satsrail_product_type_id: "pt_1" });
    const [req, ctx] = buildRequest(channel._id.toString(), { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("Merchant API key not configured");
  });

  it("returns 500 when satsrail API throws", async () => {
    const channel = await createChannel({ slug: "api-err", satsrail_product_type_id: "pt_1" });
    mockSatsrailClient.createProduct.mockRejectedValue(new Error("API down"));

    const [req, ctx] = buildRequest(channel._id.toString(), { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("API down");
  });

  it("returns 500 with generic message for non-Error throws", async () => {
    const channel = await createChannel({ slug: "non-err", satsrail_product_type_id: "pt_1" });
    mockSatsrailClient.createProduct.mockRejectedValue("string error");

    const [req, ctx] = buildRequest(channel._id.toString(), { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create channel product");
  });
});
