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

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock config cache
vi.mock("@/config/instance", () => ({
  default: { nsfw: false },
  clearConfigCache: vi.fn(),
}));

import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/admin/settings/route";
import { createSettings } from "../../helpers/factories";

function buildPutRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/admin/settings"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Admin Settings routes", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  describe("GET /api/admin/settings", () => {
    it("returns settings", async () => {
      await createSettings({
        instance_name: "My Instance",
        nsfw_enabled: false,
        theme_primary: "#3b82f6",
      });

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.settings.instance_name).toBe("My Instance");
      expect(body.settings.nsfw_enabled).toBe(false);
    });

    it("returns 404 when no settings exist", async () => {
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Settings not found");
    });
  });

  describe("PUT /api/admin/settings", () => {
    it("updates settings", async () => {
      await createSettings({ instance_name: "Old Name" });

      const req = buildPutRequest({ instance_name: "New Name" });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.settings.instance_name).toBe("New Name");
    });

    it("returns 404 when no settings exist", async () => {
      const req = buildPutRequest({ instance_name: "No Settings" });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe("Settings not found");
    });
  });
});
