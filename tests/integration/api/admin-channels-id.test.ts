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
vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
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

import { GET, PATCH, DELETE } from "@/app/api/admin/channels/[id]/route";
import { createChannel } from "../../helpers/factories";

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
    it("soft-deletes channel (sets active: false)", async () => {
      const channel = await createChannel({ name: "ToDelete", slug: "to-delete", active: true });
      const [req, ctx] = buildRequest("DELETE", channel._id.toString());
      const res = await DELETE(req, ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.active).toBe(false);
    });

    it("returns 404 for missing channel", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const [req, ctx] = buildRequest("DELETE", fakeId);
      const res = await DELETE(req, ctx);

      expect(res.status).toBe(404);
    });
  });
});
