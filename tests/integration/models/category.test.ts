import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { createCategory } from "../../helpers/factories";
import Category from "@/models/Category";

describe("Category model", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  it("creates a category with required fields", async () => {
    const category = await createCategory({ name: "Music", slug: "music" });
    expect(category.name).toBe("Music");
    expect(category.slug).toBe("music");
  });

  it("sets default values", async () => {
    const category = await createCategory();
    expect(category.position).toBe(0);
    expect(category.active).toBe(true);
  });

  it("enforces slug uniqueness", async () => {
    // Ensure the unique index is built before relying on it — Mongoose
    // creates indexes lazily in the background, which races the duplicate
    // insert on a fresh mongodb-memory-server and flakes in CI.
    await Category.init();
    await createCategory({ slug: "unique-cat" });
    await expect(createCategory({ slug: "unique-cat" })).rejects.toThrow();
  });

  it("lowercases slug", async () => {
    const category = await createCategory({ slug: "My-Category" });
    expect(category.slug).toBe("my-category");
  });

  it("queries sorted by position", async () => {
    await createCategory({ name: "Second", slug: "second", position: 2 });
    await createCategory({ name: "First", slug: "first", position: 1 });
    await createCategory({ name: "Third", slug: "third", position: 3 });

    const categories = await Category.find().sort({ position: 1 });
    expect(categories.map((c) => c.name)).toEqual(["First", "Second", "Third"]);
  });

  it("queries active categories only", async () => {
    await createCategory({ slug: "active-cat", active: true });
    await createCategory({ slug: "inactive-cat", active: false });
    const active = await Category.find({ active: true });
    expect(active).toHaveLength(1);
  });
});
