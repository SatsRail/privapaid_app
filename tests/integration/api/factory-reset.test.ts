import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { createChannel, createCategory, createCustomer } from "../../helpers/factories";

// Mock rate limit
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" })),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock connectDB
vi.mock("@/lib/mongodb", () => ({
  connectDB: vi.fn().mockImplementation(async () => mongoose),
}));

// Mock config cache
vi.mock("@/config/instance", () => ({
  clearConfigCache: vi.fn(),
}));

const mockRequireOwnerApi = vi.fn();

// Mock admin auth
vi.mock("@/lib/auth-helpers", () => ({
  requireOwnerApi: (...args: unknown[]) => mockRequireOwnerApi(...args),
}));

import { POST } from "@/app/api/admin/settings/reset/route";
import Channel from "@/models/Channel";
import Category from "@/models/Category";
import Customer from "@/models/Customer";
import Settings from "@/models/Settings";

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(async () => {
  await clearCollections();
  mockRequireOwnerApi.mockReset();
  mockRequireOwnerApi.mockResolvedValue({
    id: "admin-1",
    email: "admin@test.com",
    role: "owner",
  });
});

function resetRequest(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/settings/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
}

describe("POST /api/admin/settings/reset", () => {
  beforeAll(() => {
    mockRequireOwnerApi.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      role: "owner",
    });
  });

  it("requires owner authentication", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireOwnerApi.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const res = await POST(resetRequest({ confirm: "RESET" }));
    expect(res.status).toBe(401);
  });

  it("rejects missing confirm field", async () => {
    const res = await POST(resetRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("RESET");
  });

  it("rejects wrong confirm phrase", async () => {
    const res = await POST(resetRequest({ confirm: "DELETE" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("RESET");
  });

  it("rejects invalid JSON body", async () => {
    const req = new Request("http://localhost/api/admin/settings/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request body");
  });

  it("drops all collections on valid confirm", async () => {
    // Seed some data
    await createChannel({ name: "Test Channel", slug: "test-ch" });
    await createCategory({ name: "Test Category", slug: "test-cat" });
    await createCustomer({ nickname: "testuser" });
    await Settings.create({
      setup_completed: true,
      instance_name: "Test Instance",
      merchant_id: "m_123",
      satsrail_api_key_encrypted: "enc_key",
      satsrail_api_url: "https://satsrail.com/api/v1",
    });

    // Verify data exists
    expect(await Channel.countDocuments()).toBeGreaterThan(0);
    expect(await Category.countDocuments()).toBeGreaterThan(0);
    expect(await Customer.countDocuments()).toBeGreaterThan(0);
    expect(await Settings.countDocuments()).toBeGreaterThan(0);

    const res = await POST(resetRequest({ confirm: "RESET" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.reset).toBe(true);
    expect(body.collections_dropped).toBeDefined();
    expect(Array.isArray(body.collections_dropped)).toBe(true);
    expect(body.collections_dropped.length).toBeGreaterThan(0);

    // Verify all data is gone
    expect(await Channel.countDocuments()).toBe(0);
    expect(await Category.countDocuments()).toBe(0);
    expect(await Customer.countDocuments()).toBe(0);
    expect(await Settings.countDocuments()).toBe(0);
  });

  it("returns list of dropped collections", async () => {
    await createChannel({ name: "Ch", slug: "ch" });

    const res = await POST(resetRequest({ confirm: "RESET" }));
    const body = await res.json();

    expect(body.collections_dropped).toEqual(
      expect.arrayContaining([expect.any(String)])
    );
  });
});
