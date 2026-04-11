import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

// Mock connectDB
vi.mock("@/lib/mongodb", () => ({
  connectDB: vi.fn().mockImplementation(async () => mongoose),
}));

// We need to mock Settings.findOne dynamically
const mockFindOne = vi.fn();
vi.mock("@/models/Settings", () => ({
  default: {
    findOne: () => ({
      select: () => ({
        lean: mockFindOne,
      }),
    }),
  },
}));

// Import encryption to create a real encrypted value for testing
import { encryptSecretKey } from "@/lib/encryption";
import { getMerchantKey } from "@/lib/merchant-key";

describe("getMerchantKey", () => {
  beforeEach(() => {
    mockFindOne.mockReset();
  });

  it("returns null when no settings exist", async () => {
    mockFindOne.mockResolvedValue(null);
    const key = await getMerchantKey();
    expect(key).toBeNull();
  });

  it("returns null when no encrypted key is stored", async () => {
    mockFindOne.mockResolvedValue({ satsrail_api_key_encrypted: null });
    const key = await getMerchantKey();
    expect(key).toBeNull();
  });

  it("returns null when encrypted key is empty string", async () => {
    mockFindOne.mockResolvedValue({ satsrail_api_key_encrypted: "" });
    const key = await getMerchantKey();
    expect(key).toBeNull();
  });

  it("decrypts and returns the merchant key", async () => {
    const originalKey = "sk_live_abc123def456";
    const encrypted = encryptSecretKey(originalKey);
    mockFindOne.mockResolvedValue({ satsrail_api_key_encrypted: encrypted });

    const key = await getMerchantKey();
    expect(key).toBe(originalKey);
  });

  it("round-trips different key formats correctly", async () => {
    const keys = [
      "sk_live_short",
      "sk_live_" + "x".repeat(200),
      "sk_live_special-chars_123!@#",
    ];

    for (const originalKey of keys) {
      const encrypted = encryptSecretKey(originalKey);
      mockFindOne.mockResolvedValue({ satsrail_api_key_encrypted: encrypted });
      const result = await getMerchantKey();
      expect(result).toBe(originalKey);
    }
  });
});
