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
  encryptSourceUrl: vi.fn().mockReturnValue("encrypted_blob_456"),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/media/[id]/create-product/route";
import { createChannel, createMedia } from "../../helpers/factories";

function buildRequest(
  mediaId: string,
  body: unknown
): [NextRequest, { params: Promise<{ id: string }> }] {
  const url = new URL(`http://localhost:3000/api/admin/media/${mediaId}/create-product`);
  return [
    new NextRequest(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: mediaId }) },
  ];
}

describe("Admin Media Create Product", () => {
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

  it("creates a media product and encrypts source URL", async () => {
    const channel = await createChannel({
      slug: "ch-media-prod",
      satsrail_product_type_id: "pt_123",
    });
    const media = await createMedia(channel._id.toString(), {
      source_url: "https://example.com/video.mp4",
    });

    mockSatsrailClient.createProduct.mockResolvedValue({
      id: "prod_m1",
      name: "Media Access",
      price_cents: 500,
      slug: "media-access",
    });
    mockSatsrailClient.getProductKey.mockResolvedValue({
      key: "base64key",
      key_fingerprint: "fp_xyz",
    });

    const [req, ctx] = buildRequest(media._id.toString(), {
      name: "Media Access",
      price_cents: 500,
      currency: "USD",
    });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.media_product).toBeDefined();
    expect(body.data.product.id).toBe("prod_m1");
    expect(body.data.product.name).toBe("Media Access");
    expect(body.data.product.slug).toBe("media-access");
  });

  it("returns 422 when name is missing", async () => {
    const channel = await createChannel({ slug: "ch-no-name" });
    const media = await createMedia(channel._id.toString());
    const [req, ctx] = buildRequest(media._id.toString(), { price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("name and price_cents are required");
  });

  it("returns 422 when price_cents is missing", async () => {
    const channel = await createChannel({ slug: "ch-no-price" });
    const media = await createMedia(channel._id.toString());
    const [req, ctx] = buildRequest(media._id.toString(), { name: "Test" });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("name and price_cents are required");
  });

  it("returns 404 when media not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const [req, ctx] = buildRequest(fakeId, { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Media not found");
  });

  it("returns 422 when parent channel not found", async () => {
    // Create media with a channel_id that doesn't exist
    const fakeChannelId = new mongoose.Types.ObjectId().toString();
    const media = await createMedia(fakeChannelId);

    const [req, ctx] = buildRequest(media._id.toString(), { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("Channel not found");
  });

  it("returns 422 when channel has no product type", async () => {
    const channel = await createChannel({ slug: "ch-no-pt", satsrail_product_type_id: null });
    const media = await createMedia(channel._id.toString());

    const [req, ctx] = buildRequest(media._id.toString(), { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("no SatsRail product type");
  });

  it("returns 422 when merchant key not configured", async () => {
    mockGetMerchantKey.mockResolvedValue(null);
    const channel = await createChannel({ slug: "ch-no-key", satsrail_product_type_id: "pt_1" });
    const media = await createMedia(channel._id.toString());

    const [req, ctx] = buildRequest(media._id.toString(), { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("Merchant API key not configured");
  });

  it("returns 500 when satsrail API throws Error", async () => {
    const channel = await createChannel({ slug: "ch-api-err", satsrail_product_type_id: "pt_1" });
    const media = await createMedia(channel._id.toString());
    mockSatsrailClient.createProduct.mockRejectedValue(new Error("Upstream error"));

    const [req, ctx] = buildRequest(media._id.toString(), { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Upstream error");
  });

  it("returns 500 with generic message for non-Error throws", async () => {
    const channel = await createChannel({ slug: "ch-non-err", satsrail_product_type_id: "pt_1" });
    const media = await createMedia(channel._id.toString());
    mockSatsrailClient.createProduct.mockRejectedValue("raw string");

    const [req, ctx] = buildRequest(media._id.toString(), { name: "Test", price_cents: 500 });
    const res = await POST(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create product");
  });
});
