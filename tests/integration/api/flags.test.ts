import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";

// Mocks — MUST be before route imports
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" })) }));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn().mockImplementation(async () => mongoose) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

// auth mock — overridden per test
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

import { POST as createFlag } from "@/app/api/media/[id]/flags/route";
import Media from "@/models/Media";
import Channel from "@/models/Channel";
import Customer from "@/models/Customer";
import Flag from "@/models/Flag";
import MediaProduct from "@/models/MediaProduct";

function jsonRequest(url: string, method: string, body?: Record<string, unknown>): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = { method, headers: { "Content-Type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("Flags API — POST /api/media/[id]/flags", () => {
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

  async function seedWithProduct() {
    const channel = await Channel.create({
      ref: 10,
      slug: "ch-flags",
      name: "Flags Channel",
    });

    const media = await Media.create({
      ref: 300,
      channel_id: channel._id,
      name: "Flaggable Video",
      source_url: "https://example.com/flag.mp4",
      media_type: "video",
      position: 1,
    });

    await MediaProduct.create({
      media_id: media._id,
      satsrail_product_id: "prod_flag",
      encrypted_source_url: "encrypted_blob",
    });

    return { channelId: String(channel._id), mediaId: String(media._id) };
  }

  async function seedCustomerWithPurchase(nickname: string) {
    const customer = await Customer.create({
      nickname,
      password_hash: "hashed",
      purchases: [
        {
          satsrail_order_id: "ord_flag_1",
          satsrail_product_id: "prod_flag",
          purchased_at: new Date(),
        },
      ],
    });
    return customer;
  }

  it("creates a flag from customer with purchase", async () => {
    const { mediaId } = await seedWithProduct();
    const customer = await seedCustomerWithPurchase("flagger1");

    mockAuth.mockResolvedValue({
      user: { id: String(customer._id), name: "flagger1", role: "customer" },
    });

    const req = jsonRequest(`http://localhost:3000/api/media/${mediaId}/flags`, "POST", {
      flag_type: "inappropriate",
    });
    const res = await createFlag(req, { params: Promise.resolve({ id: mediaId }) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);

    // Verify flag was created
    const flag = await Flag.findOne({ media_id: mediaId, customer_id: customer._id });
    expect(flag).toBeTruthy();
    expect(flag!.flag_type).toBe("inappropriate");

    // Verify flags_count incremented
    const media = await Media.findById(mediaId);
    expect(media!.flags_count).toBe(1);
  });

  it("returns 409 for duplicate flag (same customer + media)", async () => {
    const { mediaId } = await seedWithProduct();
    const customer = await seedCustomerWithPurchase("flagger2");

    mockAuth.mockResolvedValue({
      user: { id: String(customer._id), name: "flagger2", role: "customer" },
    });

    // Create first flag
    await Flag.create({
      media_id: mediaId,
      customer_id: customer._id,
      flag_type: "inappropriate",
    });

    const req = jsonRequest(`http://localhost:3000/api/media/${mediaId}/flags`, "POST", {
      flag_type: "spam",
    });
    const res = await createFlag(req, { params: Promise.resolve({ id: mediaId }) });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Already flagged");
  });

  it("returns 403 without purchase", async () => {
    const { mediaId } = await seedWithProduct();

    const customer = await Customer.create({
      nickname: "nopurchaseflagger",
      password_hash: "hashed",
      purchases: [],
    });

    mockAuth.mockResolvedValue({
      user: { id: String(customer._id), name: "nopurchaseflagger", role: "customer" },
    });

    const req = jsonRequest(`http://localhost:3000/api/media/${mediaId}/flags`, "POST", {
      flag_type: "inappropriate",
    });
    const res = await createFlag(req, { params: Promise.resolve({ id: mediaId }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Purchase required to flag content");
  });

  it("returns 401 for unauthenticated user", async () => {
    const { mediaId } = await seedWithProduct();

    mockAuth.mockResolvedValue(null);

    const req = jsonRequest(`http://localhost:3000/api/media/${mediaId}/flags`, "POST", {
      flag_type: "spam",
    });
    const res = await createFlag(req, { params: Promise.resolve({ id: mediaId }) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 for non-existent media", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const customer = await seedCustomerWithPurchase("flagger3");

    mockAuth.mockResolvedValue({
      user: { id: String(customer._id), name: "flagger3", role: "customer" },
    });

    // Need to seed a channel so seedCustomerWithPurchase works, but we skip seedWithProduct
    // The flag route checks Media.findById first
    const req = jsonRequest(`http://localhost:3000/api/media/${fakeId}/flags`, "POST", {
      flag_type: "broken",
    });
    const res = await createFlag(req, { params: Promise.resolve({ id: fakeId }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Media not found");
  });

  it("returns 400 for invalid body (missing flag_type)", async () => {
    const { mediaId } = await seedWithProduct();
    const customer = await seedCustomerWithPurchase("flagger4");

    mockAuth.mockResolvedValue({
      user: { id: String(customer._id), name: "flagger4", role: "customer" },
    });

    const req = jsonRequest(`http://localhost:3000/api/media/${mediaId}/flags`, "POST", {});
    const res = await createFlag(req, { params: Promise.resolve({ id: mediaId }) });
    expect(res.status).toBe(400);
  });
});
