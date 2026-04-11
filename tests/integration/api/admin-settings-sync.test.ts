import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { NextResponse } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────
const { mockRequireOwnerApi, mockGetMerchantKey, mockSatsrail } = vi.hoisted(() => ({
  mockRequireOwnerApi: vi.fn().mockResolvedValue({
    id: "admin-1",
    email: "admin@test.com",
    role: "owner",
  }),
  mockGetMerchantKey: vi.fn().mockResolvedValue("sk_test_key"),
  mockSatsrail: {
    getMerchant: vi.fn().mockResolvedValue({
      name: "Test Merchant",
      currency: "USD",
      locale: "en",
      logo_url: "https://example.com/logo.png",
    }),
    listProducts: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/lib/mongodb", () => ({
  connectDB: vi.fn().mockImplementation(async () => mongoose),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/auth-helpers", () => ({
  requireOwnerApi: mockRequireOwnerApi,
}));
vi.mock("@/lib/merchant-key", () => ({
  getMerchantKey: mockGetMerchantKey,
}));
vi.mock("@/lib/satsrail", () => ({
  satsrail: mockSatsrail,
}));
vi.mock("@/config/instance", () => ({
  clearConfigCache: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from "@/app/api/admin/settings/sync/route";
import Settings from "@/models/Settings";
import MediaProduct from "@/models/MediaProduct";
import ChannelProduct from "@/models/ChannelProduct";

describe("Admin Settings Sync — POST /api/admin/settings/sync", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
    vi.clearAllMocks();
  });

  it("returns auth error when requireOwnerApi fails", async () => {
    mockRequireOwnerApi.mockResolvedValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 400 when no merchant key configured", async () => {
    mockGetMerchantKey.mockResolvedValueOnce(null);

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("No SatsRail API key configured");
  });

  it("returns 404 when settings not found", async () => {
    // No settings in DB
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Settings not found");
  });

  it("syncs merchant data and returns results", async () => {
    await Settings.create({
      instance_name: "Test Instance",
      setup_completed: true,
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.synced).toBe(true);
    expect(body.merchant_name).toBe("Test Merchant");
    expect(body.logo_url).toBe("https://example.com/logo.png");
    expect(body.products_synced).toBe(0);
  });

  it("skips logo_url when custom logo_image_id exists", async () => {
    await Settings.create({
      instance_name: "Test Instance",
      setup_completed: true,
      logo_image_id: new mongoose.Types.ObjectId().toString(),
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.logo_url).toBeUndefined();
  });

  it("syncs product data to MediaProduct and ChannelProduct caches", async () => {
    await Settings.create({
      instance_name: "Test Instance",
      setup_completed: true,
    });

    const mp = await MediaProduct.create({
      media_id: new mongoose.Types.ObjectId(),
      satsrail_product_id: "prod_1",
      encrypted_source_url: "enc_url",
    });

    const cp = await ChannelProduct.create({
      channel_id: new mongoose.Types.ObjectId(),
      satsrail_product_id: "prod_2",
      encrypted_media: [],
    });

    mockSatsrail.listProducts.mockResolvedValueOnce({
      data: [
        {
          id: "prod_1",
          name: "Product One",
          price_cents: 1000,
          currency: "USD",
          access_duration_seconds: 3600,
          status: "active",
          slug: "product-one",
        },
        {
          id: "prod_2",
          name: "Product Two",
          price_cents: 2000,
          currency: "EUR",
          access_duration_seconds: 7200,
          status: "active",
          slug: "product-two",
        },
      ],
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.products_synced).toBe(2);

    // Verify MediaProduct was updated
    const updatedMp = await MediaProduct.findById(mp._id).lean();
    expect(updatedMp!.product_name).toBe("Product One");
    expect(updatedMp!.product_price_cents).toBe(1000);

    // Verify ChannelProduct was updated
    const updatedCp = await ChannelProduct.findById(cp._id).lean();
    expect(updatedCp!.product_name).toBe("Product Two");
    expect(updatedCp!.product_currency).toBe("EUR");
  });

  it("handles product sync error gracefully (non-fatal)", async () => {
    await Settings.create({
      instance_name: "Test Instance",
      setup_completed: true,
    });

    mockSatsrail.listProducts.mockRejectedValueOnce(new Error("API error"));

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.synced).toBe(true);
    expect(body.products_synced).toBe(0);
  });

  it("returns 500 with invalid key message for 401 errors", async () => {
    mockSatsrail.getMerchant.mockRejectedValueOnce(new Error("Request failed: 401"));

    await Settings.create({
      instance_name: "Test Instance",
      setup_completed: true,
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Invalid API key");
  });

  it("returns 500 with generic message for other errors", async () => {
    mockSatsrail.getMerchant.mockRejectedValueOnce(new Error("Connection timeout"));

    await Settings.create({
      instance_name: "Test Instance",
      setup_completed: true,
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to sync merchant data.");
  });

  it("handles empty merchant name and currency", async () => {
    await Settings.create({
      instance_name: "Test Instance",
      setup_completed: true,
    });

    mockSatsrail.getMerchant.mockResolvedValueOnce({
      name: null,
      currency: null,
      locale: null,
      logo_url: null,
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.merchant_name).toBe("");
    expect(body.logo_url).toBe("");
  });

  it("does not update products that are not in the SatsRail response", async () => {
    await Settings.create({
      instance_name: "Test Instance",
      setup_completed: true,
    });

    await MediaProduct.create({
      media_id: new mongoose.Types.ObjectId(),
      satsrail_product_id: "prod_orphan",
      encrypted_source_url: "enc",
      product_name: "Old Name",
    });

    mockSatsrail.listProducts.mockResolvedValueOnce({
      data: [
        {
          id: "prod_other",
          name: "Other Product",
          price_cents: 500,
          currency: "USD",
          access_duration_seconds: 1800,
          status: "active",
          slug: "other-product",
        },
      ],
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.products_synced).toBe(0);
  });
});
