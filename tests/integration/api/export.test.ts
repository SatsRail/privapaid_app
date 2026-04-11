import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { createCategory, createChannel, createMedia } from "../../helpers/factories";
import MediaProduct from "@/models/MediaProduct";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock connectDB
vi.mock("@/lib/mongodb", () => ({
  connectDB: vi.fn().mockImplementation(async () => mongoose),
}));

// No SatsRail API calls in export — uses cached data from MongoDB

// Mock audit
vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

// Mock next/headers for audit
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(""),
  }),
}));

import { GET } from "@/app/api/admin/export/route";

describe("GET /api/admin/export", () => {
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

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("exports empty content when no data exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", type: "admin", role: "owner" },
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const body = JSON.parse(await res.text());
    expect(body.version).toBe("1.0");
    expect(body.exported_at).toBeDefined();
    expect(body.categories).toEqual([]);
    expect(body.channels).toEqual([]);
  });

  it("exports categories with slug, name, position, active", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", type: "admin", role: "owner" },
    });

    await createCategory({ name: "Movies", slug: "movies", position: 1, active: true });
    await createCategory({ name: "Music", slug: "music", position: 2, active: false });

    const res = await GET();
    const body = JSON.parse(await res.text());

    expect(body.categories).toHaveLength(2);
    expect(body.categories[0]).toMatchObject({
      slug: "movies",
      name: "Movies",
      position: 1,
      active: true,
    });
    expect(body.categories[1]).toMatchObject({
      slug: "music",
      name: "Music",
      position: 2,
      active: false,
    });
  });

  it("exports channels with nested media", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", type: "admin", role: "owner" },
    });

    const category = await createCategory({ name: "Education", slug: "education" });
    const channel = await createChannel({
      name: "Bitcoin 101",
      slug: "bitcoin-101",
      bio: "Learn Bitcoin",
      category_id: category._id,
      nsfw: false,
    });
    await createMedia(String(channel._id), {
      name: "Episode 1",
      source_url: "https://example.com/ep1.mp4",
      media_type: "video",
      position: 1,
    });

    const res = await GET();
    const body = JSON.parse(await res.text());

    expect(body.channels).toHaveLength(1);
    expect(body.channels[0]).toMatchObject({
      slug: "bitcoin-101",
      name: "Bitcoin 101",
      bio: "Learn Bitcoin",
    });
    expect(body.channels[0].ref).toBeDefined();
    expect(body.channels[0].media).toHaveLength(1);
    expect(body.channels[0].media[0]).toMatchObject({
      name: "Episode 1",
      source_url: "https://example.com/ep1.mp4",
      media_type: "video",
    });
    expect(body.channels[0].media[0].ref).toBeDefined();
  });

  it("exports media with product info from cached data", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", type: "admin", role: "owner" },
    });

    const channel = await createChannel({ name: "Test", slug: "test-ch" });
    const media = await createMedia(String(channel._id), {
      name: "Paid Video",
      source_url: "https://example.com/paid.mp4",
    });

    await MediaProduct.create({
      media_id: media._id,
      satsrail_product_id: "prod_123",
      encrypted_source_url: "encrypted-blob",
      key_fingerprint: "abc123",
      product_name: "Paid Video Access",
      product_price_cents: 500,
      product_currency: "USD",
      product_access_duration_seconds: 86400,
    });

    const res = await GET();
    const body = JSON.parse(await res.text());

    expect(body.channels[0].media[0].product).toMatchObject({
      name: "Paid Video Access",
      price_cents: 500,
      currency: "USD",
      access_duration_seconds: 86400,
    });
  });

  it("sets Content-Disposition header for file download", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", type: "admin", role: "owner" },
    });

    const res = await GET();
    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toMatch(/^attachment; filename="privapaid-export-\d{4}-\d{2}-\d{2}\.json"$/);
  });

  it("excludes deleted channels and media", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", type: "admin", role: "owner" },
    });

    const channel = await createChannel({ name: "Active", slug: "active-ch" });
    await createChannel({ name: "Deleted", slug: "deleted-ch", deleted_at: new Date() });
    await createMedia(String(channel._id), { name: "Active Media" });
    await createMedia(String(channel._id), { name: "Deleted Media", deleted_at: new Date() });

    const res = await GET();
    const body = JSON.parse(await res.text());

    expect(body.channels).toHaveLength(1);
    expect(body.channels[0].slug).toBe("active-ch");
    expect(body.channels[0].media).toHaveLength(1);
    expect(body.channels[0].media[0].name).toBe("Active Media");
  });
});
