import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { createChannel, createMedia, createCustomer } from "../../helpers/factories";
import Comment from "@/models/Comment";

describe("Comment model", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  it("creates a comment with required fields", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    const comment = await Comment.create({
      media_id: media._id,
      nickname: "testuser",
      body: "Great content!",
    });
    expect(comment._id).toBeDefined();
    expect(comment.media_id.toString()).toBe(media._id.toString());
    expect(comment.nickname).toBe("testuser");
    expect(comment.body).toBe("Great content!");
  });

  it("creates timestamps", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    const comment = await Comment.create({
      media_id: media._id,
      nickname: "user",
      body: "Nice",
    });
    expect(comment.created_at).toBeInstanceOf(Date);
    expect(comment.updated_at).toBeInstanceOf(Date);
  });

  it("trims nickname and body", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    const comment = await Comment.create({
      media_id: media._id,
      nickname: "  trimmed_user  ",
      body: "  trimmed body  ",
    });
    expect(comment.nickname).toBe("trimmed_user");
    expect(comment.body).toBe("trimmed body");
  });

  it("allows optional customer_id", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    const customer = await createCustomer();

    const withCustomer = await Comment.create({
      media_id: media._id,
      customer_id: customer._id,
      nickname: customer.nickname,
      body: "From a customer",
    });
    expect(withCustomer.customer_id!.toString()).toBe(customer._id.toString());

    const anonymous = await Comment.create({
      media_id: media._id,
      nickname: "anon",
      body: "Anonymous comment",
    });
    expect(anonymous.customer_id).toBeUndefined();
  });

  it("requires media_id", async () => {
    await expect(
      Comment.create({ nickname: "user", body: "No media" })
    ).rejects.toThrow();
  });

  it("requires nickname", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    await expect(
      Comment.create({ media_id: media._id, body: "No nickname" })
    ).rejects.toThrow();
  });

  it("requires body", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    await expect(
      Comment.create({ media_id: media._id, nickname: "user" })
    ).rejects.toThrow();
  });

  it("queries comments by media_id", async () => {
    const channel = await createChannel();
    const media1 = await createMedia(channel._id.toString(), { name: "Media 1" });
    const media2 = await createMedia(channel._id.toString(), { name: "Media 2" });

    await Comment.create({
      media_id: media1._id,
      nickname: "user1",
      body: "On media 1",
    });
    await Comment.create({
      media_id: media1._id,
      nickname: "user2",
      body: "Also on media 1",
    });
    await Comment.create({
      media_id: media2._id,
      nickname: "user3",
      body: "On media 2",
    });

    const comments = await Comment.find({ media_id: media1._id });
    expect(comments).toHaveLength(2);
  });
});
