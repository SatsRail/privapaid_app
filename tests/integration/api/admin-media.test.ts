import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { mockSatsrailClient } from "../../helpers/mocks/satsrail";

// Mocks — MUST be before route imports
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" })) }));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn().mockImplementation(async () => mongoose) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/auth-helpers", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "owner" }),
  requireOwnerApi: vi.fn().mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "owner" }),
  requireCustomerApi: vi.fn().mockResolvedValue({ id: "customer-1", name: "testuser" }),
}));
vi.mock("@/lib/satsrail", () => ({ satsrail: mockSatsrailClient }));
vi.mock("@/lib/merchant-key", () => ({ getMerchantKey: vi.fn().mockResolvedValue("sk_test_key") }));
vi.mock("@/lib/content-encryption", () => ({
  encryptSourceUrl: vi.fn().mockReturnValue("encrypted_blob_base64"),
  decryptSourceUrl: vi.fn().mockReturnValue("https://example.com/video.mp4"),
}));

import { GET as listMedia, POST as createMedia } from "@/app/api/admin/media/route";
import { GET as getMedia, PATCH as updateMedia, DELETE as deleteMedia } from "@/app/api/admin/media/[id]/route";
import Channel from "@/models/Channel";
import Media from "@/models/Media";

function jsonRequest(url: string, method: string, body?: Record<string, unknown>): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = { method, headers: { "Content-Type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("Admin Media API", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  async function seedChannel(): Promise<string> {
    const channel = await Channel.create({
      ref: 1,
      slug: "test-channel",
      name: "Test Channel",
      media_count: 0,
    });
    return String(channel._id);
  }

  async function seedMedia(chId: string, overrides: Record<string, unknown> = {}): Promise<string> {
    const media = await Media.create({
      ref: 100,
      channel_id: chId,
      name: "Test Video",
      source_url: "https://example.com/video.mp4",
      media_type: "video",
      position: 1,
      ...overrides,
    });
    return String(media._id);
  }

  describe("GET /api/admin/media", () => {
    it("returns media by channel", async () => {
      const chId = await seedChannel();
      await seedMedia(chId);
      await seedMedia(chId, { ref: 101, name: "Second Video", position: 2 });

      const req = jsonRequest(`http://localhost:3000/api/admin/media?channel_id=${chId}`, "GET");
      const res = await listMedia(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].name).toBe("Test Video");
    });

    it("returns 422 without channel_id", async () => {
      const req = jsonRequest("http://localhost:3000/api/admin/media", "GET");
      const res = await listMedia(req);
      const body = await res.json();

      expect(res.status).toBe(422);
      expect(body.error).toBe("channel_id is required");
    });
  });

  describe("POST /api/admin/media", () => {
    it("creates media", async () => {
      const chId = await seedChannel();
      mockSatsrailClient.getProductKey.mockResolvedValue({ key: "0".repeat(64) });

      const req = jsonRequest("http://localhost:3000/api/admin/media", "POST", {
        channel_id: chId,
        name: "New Video",
        source_url: "https://example.com/new.mp4",
        media_type: "video",
      });
      const res = await createMedia(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.data.name).toBe("New Video");
      expect(body.data.source_url).toBe("https://example.com/new.mp4");

      // Verify channel media_count incremented
      const channel = await Channel.findById(chId);
      expect(channel!.media_count).toBe(1);
    });

    it("returns 400 for invalid data (missing name)", async () => {
      const chId = await seedChannel();
      const req = jsonRequest("http://localhost:3000/api/admin/media", "POST", {
        channel_id: chId,
        source_url: "https://example.com/new.mp4",
      });
      const res = await createMedia(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent channel", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const req = jsonRequest("http://localhost:3000/api/admin/media", "POST", {
        channel_id: fakeId,
        name: "New Video",
        source_url: "https://example.com/new.mp4",
      });
      const res = await createMedia(req);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Channel not found");
    });
  });

  describe("GET /api/admin/media/[id]", () => {
    it("returns media by ID", async () => {
      const chId = await seedChannel();
      const mediaId = await seedMedia(chId);

      const req = jsonRequest(`http://localhost:3000/api/admin/media/${mediaId}`, "GET");
      const res = await getMedia(req, { params: Promise.resolve({ id: mediaId }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.name).toBe("Test Video");
      expect(body.data.product_ids).toEqual([]);
    });

    it("returns 404 for non-existent media", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const req = jsonRequest(`http://localhost:3000/api/admin/media/${fakeId}`, "GET");
      const res = await getMedia(req, { params: Promise.resolve({ id: fakeId }) });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Not found");
    });
  });

  describe("PATCH /api/admin/media/[id]", () => {
    it("updates media", async () => {
      const chId = await seedChannel();
      const mediaId = await seedMedia(chId);

      const req = jsonRequest(`http://localhost:3000/api/admin/media/${mediaId}`, "PATCH", {
        name: "Updated Title",
        description: "Updated desc",
      });
      const res = await updateMedia(req, { params: Promise.resolve({ id: mediaId }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.name).toBe("Updated Title");
      expect(body.data.description).toBe("Updated desc");
    });

    it("returns 404 for non-existent media", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const req = jsonRequest(`http://localhost:3000/api/admin/media/${fakeId}`, "PATCH", {
        name: "Nope",
      });
      const res = await updateMedia(req, { params: Promise.resolve({ id: fakeId }) });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Not found");
    });
  });

  describe("DELETE /api/admin/media/[id]", () => {
    it("soft-deletes media", async () => {
      const chId = await seedChannel();
      const mediaId = await seedMedia(chId);

      // Set initial media_count so decrement works
      await Channel.findByIdAndUpdate(chId, { media_count: 1 });

      const req = jsonRequest(`http://localhost:3000/api/admin/media/${mediaId}`, "DELETE");
      const res = await deleteMedia(req, { params: Promise.resolve({ id: mediaId }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);

      // Verify soft-delete
      const media = await Media.findById(mediaId);
      expect(media!.deleted_at).toBeTruthy();

      // Verify channel media_count decremented
      const channel = await Channel.findById(chId);
      expect(channel!.media_count).toBe(0);
    });

    it("returns 404 for non-existent media", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const req = jsonRequest(`http://localhost:3000/api/admin/media/${fakeId}`, "DELETE");
      const res = await deleteMedia(req, { params: Promise.resolve({ id: fakeId }) });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Not found");
    });

    it("returns 404 for already-deleted media", async () => {
      const chId = await seedChannel();
      const mediaId = await seedMedia(chId, { deleted_at: new Date() });

      const req = jsonRequest(`http://localhost:3000/api/admin/media/${mediaId}`, "DELETE");
      const res = await deleteMedia(req, { params: Promise.resolve({ id: mediaId }) });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Not found");
    });
  });
});
