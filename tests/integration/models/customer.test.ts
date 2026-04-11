import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { createCustomer } from "../../helpers/factories";
import Customer from "@/models/Customer";
import mongoose from "mongoose";

describe("Customer model", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  it("creates a customer with required fields", async () => {
    const customer = await createCustomer({ nickname: "testuser" });
    expect(customer.nickname).toBe("testuser");
    expect(customer.password_hash).toBeDefined();
    expect(customer._id).toBeDefined();
  });

  it("sets default values", async () => {
    const customer = await createCustomer();
    expect(customer.profile_image_id).toBe("");
    expect(customer.favorite_channel_ids).toEqual([]);
    expect(customer.purchases).toEqual([]);
    expect(customer.deleted_at).toBeNull();
  });

  it("creates timestamps", async () => {
    const customer = await createCustomer();
    expect(customer.created_at).toBeInstanceOf(Date);
    expect(customer.updated_at).toBeInstanceOf(Date);
  });

  it("enforces nickname uniqueness", async () => {
    await createCustomer({ nickname: "uniqueuser" });
    await expect(createCustomer({ nickname: "uniqueuser" })).rejects.toThrow();
  });

  it("stores purchases", async () => {
    const customer = await createCustomer();
    customer.purchases.push({
      satsrail_order_id: "order_123",
      satsrail_product_id: "prod_456",
      purchased_at: new Date(),
    });
    await customer.save();

    const found = await Customer.findById(customer._id);
    expect(found!.purchases).toHaveLength(1);
    expect(found!.purchases[0].satsrail_order_id).toBe("order_123");
  });

  it("stores favorite channel IDs", async () => {
    const customer = await createCustomer();
    const channelId = new mongoose.Types.ObjectId();
    customer.favorite_channel_ids.push(channelId);
    await customer.save();

    const found = await Customer.findById(customer._id);
    expect(found!.favorite_channel_ids).toHaveLength(1);
    expect(found!.favorite_channel_ids[0].toString()).toBe(channelId.toString());
  });

  it("trims nickname", async () => {
    const customer = await createCustomer({ nickname: "  trimmed  " });
    expect(customer.nickname).toBe("trimmed");
  });
});
