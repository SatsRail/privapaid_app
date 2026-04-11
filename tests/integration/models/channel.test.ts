import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { createChannel, createCategory } from "../../helpers/factories";
import Channel from "@/models/Channel";

describe("Channel model", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  it("creates a channel with required fields", async () => {
    const channel = await createChannel({ name: "Test Channel", slug: "test-ch" });
    expect(channel.name).toBe("Test Channel");
    expect(channel.slug).toBe("test-ch");
    expect(channel._id).toBeDefined();
  });

  it("sets default values", async () => {
    const channel = await Channel.create({
      ref: 9999,
      slug: "defaults-test",
      name: "Defaults Test",
    });
    expect(channel.active).toBe(true);
    expect(channel.nsfw).toBe(false);
    expect(channel.is_live).toBe(false);
    expect(channel.media_count).toBe(0);
    expect(channel.bio).toBe("");
    expect(channel.deleted_at).toBeNull();
  });

  it("creates timestamps", async () => {
    const channel = await createChannel();
    expect(channel.created_at).toBeInstanceOf(Date);
    expect(channel.updated_at).toBeInstanceOf(Date);
  });

  it("enforces slug uniqueness", async () => {
    await Channel.syncIndexes();
    await createChannel({ slug: "unique-slug" });
    await expect(createChannel({ slug: "unique-slug" })).rejects.toThrow();
  });

  it("lowercases slug", async () => {
    const channel = await createChannel({ slug: "My-Slug" });
    expect(channel.slug).toBe("my-slug");
  });

  it("trims name", async () => {
    const channel = await createChannel({ name: "  Trimmed  " });
    expect(channel.name).toBe("Trimmed");
  });

  it("stores social links", async () => {
    const channel = await createChannel({
      social_links: { youtube: "https://youtube.com/@test", twitter: "@test" },
    });
    expect(channel.social_links.youtube).toBe("https://youtube.com/@test");
    expect(channel.social_links.twitter).toBe("@test");
  });

  it("can associate with a category", async () => {
    const category = await createCategory();
    const channel = await createChannel({ category_id: category._id });
    expect(channel.category_id.toString()).toBe(category._id.toString());
  });

  it("queries active channels", async () => {
    await createChannel({ active: true, slug: "active-ch" });
    await createChannel({ active: false, slug: "inactive-ch" });
    const active = await Channel.find({ active: true });
    expect(active).toHaveLength(1);
    expect(active[0].slug).toBe("active-ch");
  });
});
