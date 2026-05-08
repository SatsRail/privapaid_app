import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";

// Mock rate limit
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" })),
}));

// Mock connectDB
vi.mock("@/lib/mongodb", () => ({
  connectDB: vi.fn().mockImplementation(async () => mongoose),
}));

// Mock audit
const mockAudit = vi.fn();
vi.mock("@/lib/audit", () => ({
  audit: (...args: unknown[]) => mockAudit(...args),
}));

// Mock admin auth
vi.mock("@/lib/auth-helpers", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({
    id: "admin-1",
    email: "admin@test.com",
    role: "owner",
  }),
  requireOwnerApi: vi.fn().mockResolvedValue({
    id: "admin-1",
    email: "admin@test.com",
    role: "owner",
  }),
  requireCustomerApi: vi.fn().mockResolvedValue({
    id: "customer-1",
    name: "testuser",
  }),
}));

// Mock SatsRail (channel DELETE archives products through it)
const mockDeleteProduct = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/satsrail", () => ({
  satsrail: {
    deleteProduct: (...args: unknown[]) => mockDeleteProduct(...args),
  },
}));

vi.mock("@/lib/merchant-key", () => ({
  getMerchantKey: vi.fn().mockResolvedValue("sk_live_test_key"),
}));

import { GET, PATCH, DELETE } from "@/app/api/admin/channels/[id]/route";
import { createChannel, createMedia } from "../../helpers/factories";
import Media from "@/models/Media";
import MediaProduct from "@/models/MediaProduct";
import ChannelProduct from "@/models/ChannelProduct";
import Channel from "@/models/Channel";

import { NextRequest } from "next/server";

function buildRequest(
  method: string,
  id: string,
  body?: unknown
): [NextRequest, { params: Promise<{ id: string }> }] {
  const url = new URL(`http://localhost:3000/api/admin/channels/${id}`);
  const init: { method: string; headers: Record<string, string>; body?: string } = { method, headers: { "Content-Type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return [new NextRequest(url, init), { params: Promise.resolve({ id }) }];
}

describe("Admin Channels [id] routes", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
    mockDeleteProduct.mockClear();
    mockAudit.mockClear();
  });

  describe("GET /api/admin/channels/:id", () => {
    it("returns channel by ID", async () => {
      const channel = await createChannel({ name: "Test Channel", slug: "test-ch" });
      const [req, ctx] = buildRequest("GET", channel._id.toString());
      const res = await GET(req, ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.name).toBe("Test Channel");
      expect(body.data.slug).toBe("test-ch");
    });

    it("returns 404 for unknown ID", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const [req, ctx] = buildRequest("GET", fakeId);
      const res = await GET(req, ctx);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Not found");
    });
  });

  describe("PATCH /api/admin/channels/:id", () => {
    it("updates channel fields", async () => {
      const channel = await createChannel({ name: "Old", slug: "old-ch", bio: "old bio" });
      const [req, ctx] = buildRequest("PATCH", channel._id.toString(), {
        name: "Updated",
        bio: "new bio",
      });
      const res = await PATCH(req, ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.name).toBe("Updated");
      expect(body.data.bio).toBe("new bio");
    });

    it("rejects duplicate slug", async () => {
      await createChannel({ name: "Existing", slug: "existing-slug" });
      const target = await createChannel({ name: "Target", slug: "target-slug" });
      const [req, ctx] = buildRequest("PATCH", target._id.toString(), {
        slug: "existing-slug",
      });
      const res = await PATCH(req, ctx);

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toBe("Slug already taken");
    });

    it("returns 404 for missing channel", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const [req, ctx] = buildRequest("PATCH", fakeId, { name: "Nope" });
      const res = await PATCH(req, ctx);

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/admin/channels/:id", () => {
    it("hard-deletes a channel with no media", async () => {
      const channel = await createChannel({
        name: "Empty",
        slug: "empty-ch",
        active: true,
      });
      const [req, ctx] = buildRequest("DELETE", channel._id.toString());
      const res = await DELETE(req, ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.media_deleted).toBe(0);
      expect(body.archived_product_ids).toEqual([]);

      const found = await Channel.findById(channel._id).lean();
      expect(found).toBeNull();

      // No products to archive — SatsRail must not be hit
      expect(mockDeleteProduct).not.toHaveBeenCalled();
    });

    it("cascades through media and archives all SatsRail products", async () => {
      const channel = await createChannel({ name: "Full", slug: "full-ch" });
      const channelId = channel._id.toString();

      const m1 = await createMedia(channelId, {
        name: "Video 1",
        source_url: "https://example.com/1.mp4",
      });
      const m2 = await createMedia(channelId, {
        name: "Video 2",
        source_url: "https://example.com/2.mp4",
      });

      // Two media-level products + one channel-level product = 3 SatsRail archives
      await MediaProduct.create({
        media_id: m1._id,
        satsrail_product_id: "prod_media_1",
        encrypted_source_url: "blob1",
      });
      await MediaProduct.create({
        media_id: m2._id,
        satsrail_product_id: "prod_media_2",
        encrypted_source_url: "blob2",
      });
      await ChannelProduct.create({
        channel_id: channel._id,
        satsrail_product_id: "prod_channel_1",
        encrypted_media: [
          { media_id: m1._id, encrypted_source_url: "blob1" },
          { media_id: m2._id, encrypted_source_url: "blob2" },
        ],
      });

      const [req, ctx] = buildRequest("DELETE", channelId);
      const res = await DELETE(req, ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.media_deleted).toBe(2);
      expect(body.archived_product_ids).toEqual(
        expect.arrayContaining(["prod_media_1", "prod_media_2", "prod_channel_1"])
      );
      expect(body.archived_product_ids).toHaveLength(3);

      // SatsRail called exactly once per product
      expect(mockDeleteProduct).toHaveBeenCalledTimes(3);

      // Local rows are gone
      expect(await Channel.findById(channel._id).lean()).toBeNull();
      expect(await Media.countDocuments({ channel_id: channelId })).toBe(0);
      expect(await MediaProduct.countDocuments()).toBe(0);
      expect(await ChannelProduct.countDocuments()).toBe(0);

      // Audit fires with the archived ids
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "channel.delete",
          targetId: channelId,
          details: expect.objectContaining({
            media_count: 2,
            channel_product_count: 1,
            archived_product_ids: expect.arrayContaining([
              "prod_media_1",
              "prod_media_2",
              "prod_channel_1",
            ]),
          }),
        })
      );
    });

    it("completes Mongo cleanup even when SatsRail archive fails for one product", async () => {
      const channel = await createChannel({ name: "Partial", slug: "partial-ch" });
      const channelId = channel._id.toString();
      const m1 = await createMedia(channelId, { name: "V1", source_url: "https://x.com/1" });
      const m2 = await createMedia(channelId, { name: "V2", source_url: "https://x.com/2" });
      await MediaProduct.create({
        media_id: m1._id,
        satsrail_product_id: "prod_ok",
        encrypted_source_url: "blob",
      });
      await MediaProduct.create({
        media_id: m2._id,
        satsrail_product_id: "prod_broken",
        encrypted_source_url: "blob2",
      });

      mockDeleteProduct.mockImplementation(async (_sk: string, productId: string) => {
        if (productId === "prod_broken") {
          throw new Error("SatsRail 500: server error");
        }
      });

      const [req, ctx] = buildRequest("DELETE", channelId);
      const res = await DELETE(req, ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.archived_product_ids).toEqual(["prod_ok"]);
      expect(body.archive_errors).toEqual([
        { productId: "prod_broken", error: "SatsRail 500: server error" },
      ]);

      // Mongo cleanup ran regardless of partial failure
      expect(await Channel.findById(channel._id).lean()).toBeNull();
      expect(await MediaProduct.countDocuments()).toBe(0);
    });

    it("returns 404 for missing channel", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const [req, ctx] = buildRequest("DELETE", fakeId);
      const res = await DELETE(req, ctx);

      expect(res.status).toBe(404);
    });
  });
});
