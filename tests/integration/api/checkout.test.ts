import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";

// ── Hoisted mocks ──────────────────────────────────────────────────
const { mockGetMerchantKey, mockSatsrail, mockRateLimit } = vi.hoisted(() => ({
  mockGetMerchantKey: vi.fn().mockResolvedValue("sk_test_key"),
  mockSatsrail: {
    getProduct: vi.fn().mockResolvedValue({
      id: "prod_1",
      name: "Test Product",
      slug: "test-product",
      status: "active",
    }),
    createCheckoutSession: vi.fn().mockResolvedValue({
      checkout_url: "https://satsrail.com/checkout/sess_abc",
      token: "sess_abc",
    }),
  },
  mockRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/rate-limit", () => ({ rateLimit: mockRateLimit }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/lib/mongodb", () => ({
  connectDB: vi.fn().mockImplementation(async () => mongoose),
}));
vi.mock("@/lib/merchant-key", () => ({
  getMerchantKey: mockGetMerchantKey,
}));
vi.mock("@/lib/satsrail", () => ({
  satsrail: mockSatsrail,
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/checkout/route";
import Channel from "@/models/Channel";
import Media from "@/models/Media";
import MediaProduct from "@/models/MediaProduct";
import ChannelProduct from "@/models/ChannelProduct";

function buildRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/checkout"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Checkout API — POST /api/checkout", () => {
  let channelId: string;
  let mediaId: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
    vi.clearAllMocks();
    // Restore defaults
    mockGetMerchantKey.mockResolvedValue("sk_test_key");
    mockSatsrail.getProduct.mockResolvedValue({
      id: "prod_1",
      name: "Test Product",
      slug: "test-product",
      status: "active",
    });
    mockSatsrail.createCheckoutSession.mockResolvedValue({
      checkout_url: "https://satsrail.com/checkout/sess_abc",
      token: "sess_abc",
    });
  });

  async function seedWithMediaProduct() {
    const channel = await Channel.create({
      ref: 500,
      slug: "checkout-ch",
      name: "Checkout Channel",
      active: true,
    });
    channelId = String(channel._id);

    const media = await Media.create({
      ref: 600,
      channel_id: channelId,
      name: "Paid Media",
      source_url: "https://example.com/paid.mp4",
      media_type: "video",
    });
    mediaId = String(media._id);

    await MediaProduct.create({
      media_id: mediaId,
      satsrail_product_id: "prod_1",
      encrypted_source_url: "enc_blob",
    });

    return { channelId, mediaId };
  }

  async function seedWithChannelProduct() {
    const channel = await Channel.create({
      ref: 501,
      slug: "checkout-ch-cp",
      name: "Channel Product Checkout",
      active: true,
    });
    channelId = String(channel._id);

    const media = await Media.create({
      ref: 601,
      channel_id: channelId,
      name: "Channel Paid Media",
      source_url: "https://example.com/chpaid.mp4",
      media_type: "video",
    });
    mediaId = String(media._id);

    await ChannelProduct.create({
      channel_id: channelId,
      satsrail_product_id: "prod_ch",
      encrypted_media: [
        { media_id: mediaId, encrypted_source_url: "ch_enc_blob" },
      ],
    });

    return { channelId, mediaId };
  }

  it("returns 400 when media_id is missing", async () => {
    const req = buildRequest({ product_id: "prod_1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when product_id is missing", async () => {
    const req = buildRequest({ media_id: new mongoose.Types.ObjectId().toString() });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/checkout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when media not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = buildRequest({ media_id: fakeId, product_id: "prod_1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Media not found");
  });

  it("returns 404 when channel not found", async () => {
    const fakeChannelId = new mongoose.Types.ObjectId().toString();
    const media = await Media.create({
      ref: 700,
      channel_id: fakeChannelId,
      name: "Orphan",
      source_url: "https://example.com/orphan.mp4",
      media_type: "video",
    });

    const req = buildRequest({ media_id: String(media._id), product_id: "prod_1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Channel not found");
  });

  it("returns 404 when channel is inactive", async () => {
    const channel = await Channel.create({
      ref: 502,
      slug: "inactive-checkout",
      name: "Inactive",
      active: false,
    });
    const media = await Media.create({
      ref: 701,
      channel_id: String(channel._id),
      name: "Inactive Channel Media",
      source_url: "https://example.com/inactive.mp4",
      media_type: "video",
    });

    const req = buildRequest({ media_id: String(media._id), product_id: "prod_1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Channel not found");
  });

  it("returns 400 when product not linked to media", async () => {
    const { mediaId } = await seedWithMediaProduct();

    const req = buildRequest({ media_id: mediaId, product_id: "prod_not_linked" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Product not linked to this media");
  });

  it("returns 422 when merchant key not configured", async () => {
    const { mediaId } = await seedWithMediaProduct();
    mockGetMerchantKey.mockResolvedValueOnce(null);

    const req = buildRequest({ media_id: mediaId, product_id: "prod_1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("Merchant API key not configured");
  });

  it("returns 400 when product is not active", async () => {
    const { mediaId } = await seedWithMediaProduct();
    mockSatsrail.getProduct.mockResolvedValueOnce({
      id: "prod_1",
      name: "Archived Product",
      slug: "archived-product",
      status: "archived",
    });

    const req = buildRequest({ media_id: mediaId, product_id: "prod_1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Product is not available for purchase");
  });

  it("returns 404 when product not found on SatsRail", async () => {
    const { mediaId } = await seedWithMediaProduct();
    mockSatsrail.getProduct.mockRejectedValueOnce(new Error("Not found"));

    const req = buildRequest({ media_id: mediaId, product_id: "prod_1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Product not found on SatsRail");
  });

  it("creates checkout session and returns url/token for media product", async () => {
    const { mediaId } = await seedWithMediaProduct();

    const req = buildRequest({ media_id: mediaId, product_id: "prod_1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://satsrail.com/checkout/sess_abc");
    expect(body.token).toBe("sess_abc");
    expect(mockSatsrail.createCheckoutSession).toHaveBeenCalledWith("sk_test_key", {
      checkout_session: { product_id: "test-product" },
    });
  });

  it("creates checkout session via channel product", async () => {
    const { mediaId } = await seedWithChannelProduct();
    mockSatsrail.getProduct.mockResolvedValueOnce({
      id: "prod_ch",
      name: "Channel Product",
      slug: "channel-product",
      status: "active",
    });

    const req = buildRequest({ media_id: mediaId, product_id: "prod_ch" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBeDefined();
    expect(body.token).toBeDefined();
  });

  it("returns 500 when createCheckoutSession throws", async () => {
    const { mediaId } = await seedWithMediaProduct();
    mockSatsrail.createCheckoutSession.mockRejectedValueOnce(new Error("API error"));

    const req = buildRequest({ media_id: mediaId, product_id: "prod_1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create checkout session");
  });

  it("returns rate limit response when rate limited", async () => {
    const { NextResponse } = await import("next/server");
    mockRateLimit.mockResolvedValueOnce(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );

    const req = buildRequest({ media_id: "any", product_id: "any" });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });
});
