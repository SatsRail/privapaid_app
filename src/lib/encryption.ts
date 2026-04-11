import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ─── Branded types for secret keys ──────────────────────────────────

/** A 64-hex-char AES-256 encryption key (from SK_ENCRYPTION_KEY env var). */
export type EncryptionKey = Buffer & { readonly __brand: "EncryptionKey" };

/** An encrypted value in the format iv:authTag:ciphertext (all hex). */
export type EncryptedValue = string & { readonly __brand: "EncryptedValue" };

function getEncryptionKey(): EncryptionKey {
  const key = process.env.SK_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("Please define the SK_ENCRYPTION_KEY environment variable");
  }
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("SK_ENCRYPTION_KEY must be exactly 64 hex characters (256-bit key)");
  }
  return Buffer.from(key, "hex") as EncryptionKey;
}

/**
 * Encrypt a SatsRail sk_live_ key before storing in MongoDB.
 * Uses AES-256-GCM with a random IV per encryption.
 * Returns a string: iv:authTag:ciphertext (all hex-encoded).
 */
export function encryptSecretKey(plaintext: string): EncryptedValue {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}` as EncryptedValue;
}

/**
 * Decrypt a SatsRail sk_live_ key from MongoDB.
 */
export function decryptSecretKey(encryptedValue: EncryptedValue | string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, ciphertext] = encryptedValue.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
