import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { createChannel, createMedia, createCustomer } from "../../helpers/factories";
import Flag from "@/models/Flag";

describe("Flag model", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  it("creates a flag with required fields", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    const customer = await createCustomer();
    const flag = await Flag.create({
      media_id: media._id,
      customer_id: customer._id,
      flag_type: "inappropriate",
    });
    expect(flag._id).toBeDefined();
    expect(flag.media_id.toString()).toBe(media._id.toString());
    expect(flag.customer_id.toString()).toBe(customer._id.toString());
    expect(flag.flag_type).toBe("inappropriate");
  });

  it("creates timestamps", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    const customer = await createCustomer();
    const flag = await Flag.create({
      media_id: media._id,
      customer_id: customer._id,
      flag_type: "spam",
    });
    expect(flag.created_at).toBeInstanceOf(Date);
    expect(flag.updated_at).toBeInstanceOf(Date);
  });

  it("trims flag_type", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    const customer = await createCustomer();
    const flag = await Flag.create({
      media_id: media._id,
      customer_id: customer._id,
      flag_type: "  spam  ",
    });
    expect(flag.flag_type).toBe("spam");
  });

  it("enforces one flag per customer per media", async () => {
    await Flag.syncIndexes();
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    const customer = await createCustomer();

    await Flag.create({
      media_id: media._id,
      customer_id: customer._id,
      flag_type: "inappropriate",
    });
    await expect(
      Flag.create({
        media_id: media._id,
        customer_id: customer._id,
        flag_type: "spam",
      })
    ).rejects.toThrow();
  });

  it("allows same customer to flag different media", async () => {
    await Flag.syncIndexes();
    const channel = await createChannel();
    const media1 = await createMedia(channel._id.toString(), { name: "Media 1" });
    const media2 = await createMedia(channel._id.toString(), { name: "Media 2" });
    const customer = await createCustomer();

    const flag1 = await Flag.create({
      media_id: media1._id,
      customer_id: customer._id,
      flag_type: "spam",
    });
    const flag2 = await Flag.create({
      media_id: media2._id,
      customer_id: customer._id,
      flag_type: "spam",
    });
    expect(flag1._id).toBeDefined();
    expect(flag2._id).toBeDefined();
  });

  it("allows different customers to flag same media", async () => {
    await Flag.syncIndexes();
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    const customer1 = await createCustomer();
    const customer2 = await createCustomer();

    const flag1 = await Flag.create({
      media_id: media._id,
      customer_id: customer1._id,
      flag_type: "inappropriate",
    });
    const flag2 = await Flag.create({
      media_id: media._id,
      customer_id: customer2._id,
      flag_type: "inappropriate",
    });
    expect(flag1._id).toBeDefined();
    expect(flag2._id).toBeDefined();
  });

  it("requires media_id", async () => {
    const customer = await createCustomer();
    await expect(
      Flag.create({ customer_id: customer._id, flag_type: "spam" })
    ).rejects.toThrow();
  });

  it("requires customer_id", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    await expect(
      Flag.create({ media_id: media._id, flag_type: "spam" })
    ).rejects.toThrow();
  });

  it("queries flags by media_id", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    const c1 = await createCustomer();
    const c2 = await createCustomer();

    await Flag.create({ media_id: media._id, customer_id: c1._id, flag_type: "spam" });
    await Flag.create({ media_id: media._id, customer_id: c2._id, flag_type: "inappropriate" });

    const flags = await Flag.find({ media_id: media._id });
    expect(flags).toHaveLength(2);
  });
});
