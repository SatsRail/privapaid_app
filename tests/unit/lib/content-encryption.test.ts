import { describe, it, expect } from "vitest";
import { encryptSourceUrl, decryptSourceUrl } from "@/lib/content-encryption";
import { randomBytes } from "crypto";

// Generate a valid 32-byte key in base64url format
function generateTestKey(): string {
  const keyBytes = randomBytes(32);
  return keyBytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const TEST_PRODUCT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("content-encryption", () => {
  const testKey = generateTestKey();

  describe("encryptSourceUrl / decryptSourceUrl", () => {
    it("round-trips correctly", () => {
      const url = "https://example.com/video.mp4";
      const encrypted = encryptSourceUrl(url, testKey, TEST_PRODUCT_ID);
      const decrypted = decryptSourceUrl(encrypted, testKey, TEST_PRODUCT_ID);
      expect(decrypted).toBe(url);
    });

    it("produces different ciphertexts for same plaintext (random IV)", () => {
      const url = "https://example.com/video.mp4";
      const a = encryptSourceUrl(url, testKey, TEST_PRODUCT_ID);
      const b = encryptSourceUrl(url, testKey, TEST_PRODUCT_ID);
      expect(a).not.toBe(b);
    });

    it("output is valid base64", () => {
      const encrypted = encryptSourceUrl("test", testKey, TEST_PRODUCT_ID);
      expect(() => Buffer.from(encrypted, "base64")).not.toThrow();
    });

    it("handles empty string", () => {
      const encrypted = encryptSourceUrl("", testKey, TEST_PRODUCT_ID);
      const decrypted = decryptSourceUrl(encrypted, testKey, TEST_PRODUCT_ID);
      expect(decrypted).toBe("");
    });

    it("handles long URLs", () => {
      const url = "https://example.com/" + "a".repeat(5000);
      const encrypted = encryptSourceUrl(url, testKey, TEST_PRODUCT_ID);
      const decrypted = decryptSourceUrl(encrypted, testKey, TEST_PRODUCT_ID);
      expect(decrypted).toBe(url);
    });

    it("handles standard base64 keys (with + and /)", () => {
      const keyBytes = randomBytes(32);
      const standardB64 = keyBytes.toString("base64");
      const url = "https://example.com/test.mp4";
      const encrypted = encryptSourceUrl(url, standardB64, TEST_PRODUCT_ID);
      const decrypted = decryptSourceUrl(encrypted, standardB64, TEST_PRODUCT_ID);
      expect(decrypted).toBe(url);
    });
  });

  describe("AAD binding (product isolation)", () => {
    it("fails decryption when productId differs", () => {
      const url = "https://example.com/video.mp4";
      const encrypted = encryptSourceUrl(url, testKey, TEST_PRODUCT_ID);
      const wrongProductId = "660e8400-e29b-41d4-a716-446655440001";
      expect(() => decryptSourceUrl(encrypted, testKey, wrongProductId)).toThrow();
    });

    it("fails decryption with empty productId when encrypted with non-empty", () => {
      const url = "https://example.com/video.mp4";
      const encrypted = encryptSourceUrl(url, testKey, TEST_PRODUCT_ID);
      expect(() => decryptSourceUrl(encrypted, testKey, "")).toThrow();
    });
  });

  describe("invalid inputs", () => {
    it("throws for wrong key length (too short)", () => {
      const shortKey = randomBytes(16).toString("base64");
      expect(() => encryptSourceUrl("test", shortKey, TEST_PRODUCT_ID)).toThrow("32 bytes");
    });

    it("throws for wrong key length (too long)", () => {
      const longKey = randomBytes(48).toString("base64");
      expect(() => encryptSourceUrl("test", longKey, TEST_PRODUCT_ID)).toThrow("32 bytes");
    });

    it("throws for blob too short on decrypt", () => {
      expect(() => decryptSourceUrl("AAAA", testKey, TEST_PRODUCT_ID)).toThrow("too short");
    });

    it("fails decryption with wrong key", () => {
      const encrypted = encryptSourceUrl("secret", testKey, TEST_PRODUCT_ID);
      const wrongKey = generateTestKey();
      expect(() => decryptSourceUrl(encrypted, wrongKey, TEST_PRODUCT_ID)).toThrow();
    });

    it("fails decryption with tampered ciphertext", () => {
      const encrypted = encryptSourceUrl("secret", testKey, TEST_PRODUCT_ID);
      const raw = Buffer.from(encrypted, "base64");
      // Flip a byte in the ciphertext region
      raw[15] ^= 0xff;
      const tampered = raw.toString("base64");
      expect(() => decryptSourceUrl(tampered, testKey, TEST_PRODUCT_ID)).toThrow();
    });
  });
});
