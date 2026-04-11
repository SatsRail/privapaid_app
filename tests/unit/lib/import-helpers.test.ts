import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockChannelFindById = vi.fn();
const mockChannelFindByIdAndUpdate = vi.fn();
vi.mock("@/models/Channel", () => ({
  default: {
    findById: (...args: unknown[]) => ({
      lean: () => mockChannelFindById(...args),
    }),
    findByIdAndUpdate: (...args: unknown[]) => mockChannelFindByIdAndUpdate(...args),
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock("@/models/Media", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
    findByIdAndUpdate: vi.fn(),
  },
}));

const mockMediaProductFindOne = vi.fn();
const mockMediaProductCreate = vi.fn();
const mockMediaProductFindByIdAndUpdate = vi.fn();
vi.mock("@/models/MediaProduct", () => ({
  default: {
    findOne: (...args: unknown[]) => mockMediaProductFindOne(...args),
    create: (...args: unknown[]) => mockMediaProductCreate(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockMediaProductFindByIdAndUpdate(...args),
  },
}));

const mockChannelProductFindOne = vi.fn();
const mockChannelProductCreate = vi.fn();
const mockChannelProductFindByIdAndUpdate = vi.fn();
vi.mock("@/models/ChannelProduct", () => ({
  default: {
    findOne: (...args: unknown[]) => mockChannelProductFindOne(...args),
    create: (...args: unknown[]) => mockChannelProductCreate(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockChannelProductFindByIdAndUpdate(...args),
  },
}));

vi.mock("@/models/Counter", () => ({
  getNextRef: vi.fn().mockResolvedValue(500),
}));

const mockCreateProductType = vi.fn();
const mockListProductTypes = vi.fn();
const mockCreateProduct = vi.fn();
const mockListProducts = vi.fn();
const mockGetProductKey = vi.fn();
const mockUpdateProduct = vi.fn();
vi.mock("@/lib/satsrail", () => ({
  satsrail: {
    createProductType: (...args: unknown[]) => mockCreateProductType(...args),
    listProductTypes: (...args: unknown[]) => mockListProductTypes(...args),
    createProduct: (...args: unknown[]) => mockCreateProduct(...args),
    listProducts: (...args: unknown[]) => mockListProducts(...args),
    getProductKey: (...args: unknown[]) => mockGetProductKey(...args),
    updateProduct: (...args: unknown[]) => mockUpdateProduct(...args),
  },
}));

const mockEncryptSourceUrl = vi.fn().mockReturnValue("encrypted_url");
vi.mock("@/lib/content-encryption", () => ({
  encryptSourceUrl: (...args: unknown[]) => mockEncryptSourceUrl(...args),
}));

vi.mock("@/lib/validate", () => ({
  schemas: {},
}));

// ─── Imports (after mocks) ──────────────────────────────────────────

import {
  withRetry,
  isExternalRefTaken,
  createProductSafeType,
  createProductSafe,
  getProductKeySafe,
  handleExistingMediaProduct,
  createEncryptedChannelProduct,
  createApiThrottle,
  delay,
} from "@/lib/import-helpers";

// Speed up tests by stubbing delay
vi.mock("@/lib/import-helpers", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/import-helpers")>();
  return {
    ...mod,
    delay: vi.fn().mockResolvedValue(undefined),
  };
});

// ─── Tests ──────────────────────────────────────────────────────────

describe("import-helpers", () => {
  // delay is mocked to resolve immediately, so throttle adds no wait
  const api = createApiThrottle(0);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── withRetry ─────────────────────────────────────────────────────

  describe("withRetry", () => {
    it("returns the result on first success", async () => {
      const fn = vi.fn().mockResolvedValue("ok");
      const result = await withRetry(fn);
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("throws immediately for non-rate-limit errors", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Connection refused"));
      await expect(withRetry(fn)).rejects.toThrow("Connection refused");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("throws immediately for non-Error throws", async () => {
      const fn = vi.fn().mockRejectedValue("string error");
      await expect(withRetry(fn)).rejects.toBe("string error");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on 429 rate limit errors", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("429 Too Many Requests, retry after 1"))
        .mockResolvedValue("success");
      const result = await withRetry(fn);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("throws after exhausting retries on rate limit errors", async () => {
      const rateLimitError = new Error("429 Too Many Requests, retry after 1");
      const fn = vi.fn().mockRejectedValue(rateLimitError);
      await expect(withRetry(fn, 2)).rejects.toThrow("429");
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  // ── isExternalRefTaken ────────────────────────────────────────────

  describe("isExternalRefTaken", () => {
    it("returns true for external ref taken error", () => {
      expect(isExternalRefTaken(new Error("External ref has already been taken"))).toBe(true);
    });

    it("returns false for other errors", () => {
      expect(isExternalRefTaken(new Error("Something else"))).toBe(false);
    });

    it("returns false for non-Error values", () => {
      expect(isExternalRefTaken("string")).toBe(false);
      expect(isExternalRefTaken(null)).toBe(false);
    });
  });

  // ── createProductSafeType ─────────────────────────────────────────

  describe("createProductSafeType", () => {
    it("creates product type when none exists", async () => {
      mockListProductTypes.mockResolvedValue({ data: [] });
      mockCreateProductType.mockResolvedValue({ id: "pt_1" });
      const result = await createProductSafeType("sk", "Name", "ref_1", api);
      expect(result).toEqual({ id: "pt_1" });
      expect(mockListProductTypes).toHaveBeenCalledOnce();
      expect(mockCreateProductType).toHaveBeenCalledOnce();
    });

    it("returns existing product type when found by external_ref", async () => {
      mockListProductTypes.mockResolvedValue({
        data: [
          { id: "pt_old", external_ref: "ref_1" },
          { id: "pt_other", external_ref: "ref_other" },
        ],
      });

      const result = await createProductSafeType("sk", "Name", "ref_1", api);
      expect(result).toEqual({ id: "pt_old", external_ref: "ref_1" });
      expect(mockCreateProductType).not.toHaveBeenCalled();
    });

    it("creates product type when no match found in existing list", async () => {
      mockListProductTypes.mockResolvedValue({
        data: [{ id: "pt_other", external_ref: "ref_other" }],
      });
      mockCreateProductType.mockResolvedValue({ id: "pt_new" });

      const result = await createProductSafeType("sk", "Name", "ref_1", api);
      expect(result).toEqual({ id: "pt_new" });
    });

    it("throws creation errors", async () => {
      mockListProductTypes.mockResolvedValue({ data: [] });
      mockCreateProductType.mockRejectedValue(new Error("Server error"));
      await expect(createProductSafeType("sk", "Name", "ref_1", api)).rejects.toThrow("Server error");
    });
  });

  // ── createProductSafe ─────────────────────────────────────────────

  describe("createProductSafe", () => {
    const productData = {
      name: "Product",
      price_cents: 100,
      external_ref: "md_1",
    };

    it("creates product when none exists by external_ref", async () => {
      mockListProducts.mockResolvedValue({ data: [] });
      mockCreateProduct.mockResolvedValue({ id: "prod_1" });
      const result = await createProductSafe("sk", productData, api);
      expect(result).toEqual({ id: "prod_1" });
      expect(mockListProducts).toHaveBeenCalledOnce();
      expect(mockCreateProduct).toHaveBeenCalledOnce();
    });

    it("returns existing product and updates metadata when found by external_ref", async () => {
      mockListProducts.mockResolvedValue({
        data: [{ id: "prod_existing", external_ref: "md_1" }],
      });
      mockUpdateProduct.mockResolvedValue({});

      const result = await createProductSafe("sk", productData, api);
      expect(result).toEqual({ id: "prod_existing", external_ref: "md_1" });
      expect(mockCreateProduct).not.toHaveBeenCalled();
      expect(mockUpdateProduct).toHaveBeenCalledWith("sk", "prod_existing", {
        name: "Product",
        price_cents: 100,
        access_duration_seconds: undefined,
      });
    });

    it("creates product when no external_ref provided (skips check)", async () => {
      mockCreateProduct.mockResolvedValue({ id: "prod_new" });
      const result = await createProductSafe("sk", { name: "Product", price_cents: 100 }, api);
      expect(result).toEqual({ id: "prod_new" });
      expect(mockListProducts).not.toHaveBeenCalled();
    });

    it("throws creation errors", async () => {
      mockListProducts.mockResolvedValue({ data: [] });
      mockCreateProduct.mockRejectedValue(new Error("Validation failed"));
      await expect(createProductSafe("sk", productData, api)).rejects.toThrow("Validation failed");
    });
  });

  // ── getProductKeySafe ─────────────────────────────────────────────

  describe("getProductKeySafe", () => {
    const productData = {
      name: "Product",
      price_cents: 100,
      external_ref: "md_1",
    };

    it("returns key on success", async () => {
      mockGetProductKey.mockResolvedValue({ key: "k1", key_fingerprint: "fp1" });
      const result = await getProductKeySafe("sk", "prod_1", productData, api);
      expect(result).toEqual({ productId: "prod_1", key: "k1", key_fingerprint: "fp1" });
    });

    it("creates fresh product on 404 error", async () => {
      mockGetProductKey
        .mockRejectedValueOnce(new Error("404 Not Found"))
        .mockResolvedValue({ key: "k2", key_fingerprint: "fp2" });
      mockCreateProduct.mockResolvedValue({ id: "prod_new" });

      const result = await getProductKeySafe("sk", "prod_orphan", productData, api);
      expect(result).toEqual({ productId: "prod_new", key: "k2", key_fingerprint: "fp2" });
      expect(mockCreateProduct).toHaveBeenCalled();
    });

    it("throws non-404 errors directly", async () => {
      mockGetProductKey.mockRejectedValue(new Error("500 Internal Server Error"));
      await expect(getProductKeySafe("sk", "prod_1", productData, api)).rejects.toThrow("500");
    });
  });

  // ── handleExistingMediaProduct ────────────────────────────────────

  describe("handleExistingMediaProduct", () => {
    const mData = {
      name: "Video",
      description: "",
      source_url: "https://example.com/v.mp4",
      media_type: "video" as const,
      thumbnail_url: "",
      preview_image_urls: [] as string[],
      product: {
        name: "Access",
        price_cents: 200,
        currency: "USD",
        access_duration_seconds: 3600,
      },
    };

    it("returns early when no product_type_id and no existing product", async () => {
      mockMediaProductFindOne.mockResolvedValue(null);
      const errors: { entity: string; name: string; error: string }[] = [];

      await handleExistingMediaProduct(
        "sk",
        mData,
        { _id: "media_1", ref: 10 },
        false,
        { _id: "ch_1", satsrail_product_type_id: null },
        errors,
        api
      );

      expect(errors).toHaveLength(0);
      // Should not attempt to create product (no product_type_id)
      expect(mockCreateProduct).not.toHaveBeenCalled();
    });

    it("creates product for existing media when product_type_id exists and no existing product", async () => {
      mockMediaProductFindOne.mockResolvedValue(null);
      mockCreateProduct.mockResolvedValue({ id: "prod_new" });
      mockGetProductKey.mockResolvedValue({ key: "k1", key_fingerprint: "fp1" });
      mockMediaProductCreate.mockResolvedValue({});
      const errors: { entity: string; name: string; error: string }[] = [];

      await handleExistingMediaProduct(
        "sk",
        mData,
        { _id: "media_1", ref: 10 },
        false,
        { _id: "ch_1", satsrail_product_type_id: "pt_1" },
        errors,
        api
      );

      expect(errors).toHaveLength(0);
      expect(mockCreateProduct).toHaveBeenCalled();
      expect(mockMediaProductCreate).toHaveBeenCalled();
    });

    it("pushes error when product creation fails for existing media", async () => {
      mockMediaProductFindOne.mockResolvedValue(null);
      mockCreateProduct.mockRejectedValue(new Error("API down"));
      const errors: { entity: string; name: string; error: string }[] = [];

      await handleExistingMediaProduct(
        "sk",
        mData,
        { _id: "media_1", ref: 10 },
        false,
        { _id: "ch_1", satsrail_product_type_id: "pt_1" },
        errors,
        api
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].entity).toBe("media_product");
      expect(errors[0].error).toContain("Product creation failed");
    });

    it("updates existing product when found", async () => {
      mockMediaProductFindOne.mockResolvedValue({
        _id: "mp_1",
        satsrail_product_id: "prod_existing",
      });
      mockUpdateProduct.mockResolvedValue({});
      const errors: { entity: string; name: string; error: string }[] = [];

      await handleExistingMediaProduct(
        "sk",
        mData,
        { _id: "media_1", ref: 10 },
        false,
        { _id: "ch_1", satsrail_product_type_id: "pt_1" },
        errors,
        api
      );

      expect(errors).toHaveLength(0);
      expect(mockUpdateProduct).toHaveBeenCalledWith("sk", "prod_existing", expect.any(Object));
    });

    it("pushes error when product update fails", async () => {
      mockMediaProductFindOne.mockResolvedValue({
        _id: "mp_1",
        satsrail_product_id: "prod_existing",
      });
      mockUpdateProduct.mockRejectedValue(new Error("Update failed"));
      const errors: { entity: string; name: string; error: string }[] = [];

      await handleExistingMediaProduct(
        "sk",
        mData,
        { _id: "media_1", ref: 10 },
        false,
        { _id: "ch_1", satsrail_product_type_id: "pt_1" },
        errors,
        api
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].error).toContain("Product update failed");
    });
  });

  // ── createEncryptedChannelProduct ─────────────────────────────────

  describe("createEncryptedChannelProduct", () => {
    const productData = {
      name: "Channel Access",
      price_cents: 1000,
      currency: "USD",
      access_duration_seconds: 86400,
      product_type_id: "pt_1",
      external_ref: "ch_100",
    };
    const channelId = "ch_abc";

    describe("when ChannelProduct already exists (update path)", () => {
      it("updates existing product and re-encrypts media", async () => {
        const existingCP = {
          _id: "cp_1",
          satsrail_product_id: "prod_existing",
          channel_id: channelId,
        };
        mockChannelProductFindOne.mockResolvedValue(existingCP);
        mockUpdateProduct.mockResolvedValue({});
        mockGetProductKey.mockResolvedValue({
          key: "k1",
          key_fingerprint: "fp_new",
          productId: "prod_existing",
        });

        // Mock Media.find to return media items
        const Media = (await import("@/models/Media")).default;
        (Media.find as ReturnType<typeof vi.fn>).mockReturnValue({
          select: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([
              { _id: "m1", source_url: "https://example.com/v1.mp4" },
              { _id: "m2", source_url: "https://example.com/v2.mp4" },
            ]),
          }),
        });

        mockChannelProductFindByIdAndUpdate.mockResolvedValue({});

        await createEncryptedChannelProduct("sk", productData, channelId, api);

        expect(mockUpdateProduct).toHaveBeenCalledWith("sk", "prod_existing", {
          name: "Channel Access",
          price_cents: 1000,
          access_duration_seconds: 86400,
        });
        expect(mockEncryptSourceUrl).toHaveBeenCalledTimes(2);
        expect(mockChannelProductFindByIdAndUpdate).toHaveBeenCalledWith(
          "cp_1",
          expect.objectContaining({
            key_fingerprint: "fp_new",
            product_name: "Channel Access",
            product_price_cents: 1000,
            product_status: "active",
          })
        );
      });
    });

    describe("when no ChannelProduct exists (create path)", () => {
      it("creates new product and ChannelProduct document", async () => {
        mockChannelProductFindOne.mockResolvedValue(null);
        mockCreateProduct.mockResolvedValue({ id: "prod_new" });
        mockGetProductKey.mockResolvedValue({
          key: "k2",
          key_fingerprint: "fp_created",
          productId: "prod_new",
        });

        const Media = (await import("@/models/Media")).default;
        (Media.find as ReturnType<typeof vi.fn>).mockReturnValue({
          select: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([
              { _id: "m1", source_url: "https://example.com/v1.mp4" },
            ]),
          }),
        });

        mockChannelProductCreate.mockResolvedValue({});

        await createEncryptedChannelProduct("sk", productData, channelId, api);

        expect(mockCreateProduct).toHaveBeenCalled();
        expect(mockEncryptSourceUrl).toHaveBeenCalledTimes(1);
        expect(mockChannelProductCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            channel_id: channelId,
            satsrail_product_id: "prod_new",
            key_fingerprint: "fp_created",
            product_name: "Channel Access",
            product_price_cents: 1000,
            product_status: "active",
          })
        );
      });

      it("creates ChannelProduct with empty encrypted_media when channel has no media", async () => {
        mockChannelProductFindOne.mockResolvedValue(null);
        mockCreateProduct.mockResolvedValue({ id: "prod_empty" });
        mockGetProductKey.mockResolvedValue({
          key: "k3",
          key_fingerprint: "fp_empty",
          productId: "prod_empty",
        });

        const Media = (await import("@/models/Media")).default;
        (Media.find as ReturnType<typeof vi.fn>).mockReturnValue({
          select: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        });

        mockChannelProductCreate.mockResolvedValue({});

        await createEncryptedChannelProduct("sk", productData, channelId, api);

        expect(mockChannelProductCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            encrypted_media: [],
          })
        );
      });
    });
  });
});
