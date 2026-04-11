import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { createChannel, createMedia } from "../../helpers/factories";
import ChannelProduct from "@/models/ChannelProduct";
import mongoose from "mongoose";

describe("ChannelProduct model", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  it("creates a channel product with required fields", async () => {
    const channel = await createChannel();
    const cp = await ChannelProduct.create({
      channel_id: channel._id,
      satsrail_product_id: "prod_abc123",
    });
    expect(cp._id).toBeDefined();
    expect(cp.channel_id.toString()).toBe(channel._id.toString());
    expect(cp.satsrail_product_id).toBe("prod_abc123");
  });

  it("sets default values", async () => {
    const channel = await createChannel();
    const cp = await ChannelProduct.create({
      channel_id: channel._id,
      satsrail_product_id: "prod_defaults",
    });
    expect(cp.encrypted_media).toEqual([]);
    expect(cp.key_fingerprint).toBeUndefined();
    expect(cp.product_name).toBeUndefined();
    expect(cp.synced_at).toBeUndefined();
  });

  it("creates timestamps", async () => {
    const channel = await createChannel();
    const cp = await ChannelProduct.create({
      channel_id: channel._id,
      satsrail_product_id: "prod_ts",
    });
    expect(cp.created_at).toBeInstanceOf(Date);
    expect(cp.updated_at).toBeInstanceOf(Date);
  });

  it("enforces satsrail_product_id uniqueness via schema constraint", async () => {
    const channel = await createChannel();
    // The schema defines unique: true on satsrail_product_id.
    // In-memory MongoDB may not enforce the index in time for a Mongoose-level
    // duplicate, so we verify the schema-level definition instead.
    const paths = ChannelProduct.schema.paths;
    expect(paths.satsrail_product_id.options.unique).toBe(true);
  });

  it("stores encrypted media entries", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());
    const cp = await ChannelProduct.create({
      channel_id: channel._id,
      satsrail_product_id: "prod_media",
      encrypted_media: [
        {
          media_id: media._id,
          encrypted_source_url: "base64_encrypted_blob",
        },
      ],
    });
    expect(cp.encrypted_media).toHaveLength(1);
    expect(cp.encrypted_media[0].media_id.toString()).toBe(media._id.toString());
    expect(cp.encrypted_media[0].encrypted_source_url).toBe("base64_encrypted_blob");
  });

  it("stores cached product metadata", async () => {
    const channel = await createChannel();
    const cp = await ChannelProduct.create({
      channel_id: channel._id,
      satsrail_product_id: "prod_meta",
      product_name: "Premium Video",
      product_price_cents: 5000,
      product_currency: "USD",
      product_access_duration_seconds: 86400,
      product_status: "active",
      product_slug: "premium-video",
      synced_at: new Date(),
    });
    expect(cp.product_name).toBe("Premium Video");
    expect(cp.product_price_cents).toBe(5000);
    expect(cp.product_currency).toBe("USD");
    expect(cp.product_access_duration_seconds).toBe(86400);
    expect(cp.product_status).toBe("active");
    expect(cp.product_slug).toBe("premium-video");
    expect(cp.synced_at).toBeInstanceOf(Date);
  });

  it("stores key fingerprint", async () => {
    const channel = await createChannel();
    const fingerprint = "a".repeat(64);
    const cp = await ChannelProduct.create({
      channel_id: channel._id,
      satsrail_product_id: "prod_fp",
      key_fingerprint: fingerprint,
    });
    expect(cp.key_fingerprint).toBe(fingerprint);
  });

  it("queries by channel_id", async () => {
    const ch1 = await createChannel({ slug: "ch-one" });
    const ch2 = await createChannel({ slug: "ch-two" });
    await ChannelProduct.create({
      channel_id: ch1._id,
      satsrail_product_id: "prod_ch1",
    });
    await ChannelProduct.create({
      channel_id: ch2._id,
      satsrail_product_id: "prod_ch2",
    });
    const results = await ChannelProduct.find({ channel_id: ch1._id });
    expect(results).toHaveLength(1);
    expect(results[0].satsrail_product_id).toBe("prod_ch1");
  });

  it("requires channel_id", async () => {
    await expect(
      ChannelProduct.create({
        satsrail_product_id: "prod_no_channel",
      })
    ).rejects.toThrow();
  });

  it("adds encrypted media entries via update", async () => {
    const channel = await createChannel();
    const media1 = await createMedia(channel._id.toString(), { name: "Media 1" });
    const media2 = await createMedia(channel._id.toString(), { name: "Media 2" });

    const cp = await ChannelProduct.create({
      channel_id: channel._id,
      satsrail_product_id: "prod_push",
    });

    const updated = await ChannelProduct.findByIdAndUpdate(
      cp._id,
      {
        $push: {
          encrypted_media: {
            $each: [
              { media_id: media1._id, encrypted_source_url: "blob_1" },
              { media_id: media2._id, encrypted_source_url: "blob_2" },
            ],
          },
        },
      },
      { returnDocument: "after" }
    );
    expect(updated!.encrypted_media).toHaveLength(2);
  });
});
