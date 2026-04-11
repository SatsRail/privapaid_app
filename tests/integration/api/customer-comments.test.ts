import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose, { Types } from "mongoose";
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

const { customerId } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Types } = require("mongoose");
  return { customerId: new Types.ObjectId() };
});

vi.mock("@/lib/auth-helpers", () => ({
  requireCustomerApi: vi.fn().mockResolvedValue({
    id: customerId.toString(),
    name: "testuser",
  }),
}));

import { GET } from "@/app/api/customer/comments/route";
import Comment from "@/models/Comment";
import { createChannel, createMedia } from "../../helpers/factories";

describe("GET /api/customer/comments", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  it("returns empty data when customer has no comments", async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("returns comments for the authenticated customer", async () => {
    const channel = await createChannel();
    const media = await createMedia(String(channel._id), { name: "Test Video" });

    await Comment.create({
      media_id: media._id,
      customer_id: customerId,
      nickname: "testuser",
      body: "Great video!",
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].body).toBe("Great video!");
    expect(body.data[0].nickname).toBe("testuser");
    expect(body.data[0].media).toBeTruthy();
    expect(body.data[0].media.name).toBe("Test Video");
    expect(body.data[0].media.channel_slug).toBe(channel.slug);
    expect(body.data[0].media.channel_name).toBe(channel.name);
  });

  it("does not return comments from other customers", async () => {
    const channel = await createChannel();
    const media = await createMedia(String(channel._id));
    const otherId = new Types.ObjectId();

    await Comment.create({
      media_id: media._id,
      customer_id: otherId,
      nickname: "otheruser",
      body: "Someone else's comment",
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
  });

  it("returns comments sorted by created_at descending", async () => {
    const channel = await createChannel();
    const media = await createMedia(String(channel._id));

    await Comment.create({
      media_id: media._id,
      customer_id: customerId,
      nickname: "testuser",
      body: "First comment",
      created_at: new Date("2024-01-01"),
    });

    await Comment.create({
      media_id: media._id,
      customer_id: customerId,
      nickname: "testuser",
      body: "Second comment",
      created_at: new Date("2024-06-01"),
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].body).toBe("Second comment");
    expect(body.data[1].body).toBe("First comment");
  });

  it("handles comments with deleted media gracefully", async () => {
    const deletedMediaId = new Types.ObjectId();

    await Comment.create({
      media_id: deletedMediaId,
      customer_id: customerId,
      nickname: "testuser",
      body: "Comment on deleted media",
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].body).toBe("Comment on deleted media");
    expect(body.data[0].media).toBeNull();
  });
});
