import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { setupTestDB, teardownTestDB, clearCollections } from "../../helpers/mongodb";
import { createChannel, createMedia } from "../../helpers/factories";
import MediaProduct from "@/models/MediaProduct";

describe("MediaProduct model", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearCollections();
  });

  it("creates a media product with required fields", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());

    const mp = await MediaProduct.create({
      media_id: media._id,
      satsrail_product_id: "prod_test_123",
      encrypted_source_url: "base64encryptedblob==",
    });

    expect(mp.media_id.toString()).toBe(media._id.toString());
    expect(mp.satsrail_product_id).toBe("prod_test_123");
    expect(mp.encrypted_source_url).toBe("base64encryptedblob==");
    expect(mp.created_at).toBeInstanceOf(Date);
  });

  it("stores key_fingerprint", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());

    const mp = await MediaProduct.create({
      media_id: media._id,
      satsrail_product_id: "prod_fp_123",
      encrypted_source_url: "blob==",
      key_fingerprint: "sha256hexfingerprint",
    });

    expect(mp.key_fingerprint).toBe("sha256hexfingerprint");
  });

  it("enforces media_id uniqueness", async () => {
    await MediaProduct.syncIndexes();
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());

    await MediaProduct.create({
      media_id: media._id,
      satsrail_product_id: "prod_1",
      encrypted_source_url: "blob1==",
    });

    await expect(
      MediaProduct.create({
        media_id: media._id,
        satsrail_product_id: "prod_2",
        encrypted_source_url: "blob2==",
      })
    ).rejects.toThrow();
  });

  it("queries by satsrail_product_id (bulk re-encryption pattern)", async () => {
    const channel = await createChannel();
    const m1 = await createMedia(channel._id.toString(), { name: "Media 1" });
    const m2 = await createMedia(channel._id.toString(), { name: "Media 2" });
    const m3 = await createMedia(channel._id.toString(), { name: "Media 3" });

    // Two products belong to same SatsRail product
    await MediaProduct.create({
      media_id: m1._id,
      satsrail_product_id: "prod_bulk",
      encrypted_source_url: "blob1==",
    });
    await MediaProduct.create({
      media_id: m2._id,
      satsrail_product_id: "prod_bulk",
      encrypted_source_url: "blob2==",
    });
    // Third belongs to a different product
    await MediaProduct.create({
      media_id: m3._id,
      satsrail_product_id: "prod_other",
      encrypted_source_url: "blob3==",
    });

    const results = await MediaProduct.find({ satsrail_product_id: "prod_bulk" });
    expect(results).toHaveLength(2);
  });

  it("updates encrypted_source_url (re-encryption simulation)", async () => {
    const channel = await createChannel();
    const media = await createMedia(channel._id.toString());

    const mp = await MediaProduct.create({
      media_id: media._id,
      satsrail_product_id: "prod_reencrypt",
      encrypted_source_url: "old_blob==",
      key_fingerprint: "old_fp",
    });

    mp.encrypted_source_url = "new_blob==";
    mp.key_fingerprint = "new_fp";
    await mp.save();

    const updated = await MediaProduct.findById(mp._id);
    expect(updated!.encrypted_source_url).toBe("new_blob==");
    expect(updated!.key_fingerprint).toBe("new_fp");
  });
});
