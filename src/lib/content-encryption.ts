import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Decode a Base64url-encoded string to a Buffer.
 * Handles both standard Base64 and URL-safe Base64.
 */
function base64urlDecode(encoded: string): Buffer {
  let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return Buffer.from(b64, "base64");
}

/**
 * Encrypt a media source URL using a SatsRail product key.
 *
 * Produces a blob byte-identical to StreamEncryptionService.rb:
 *   Base64(IV[12] + ciphertext + authTag[16])
 *
 * The productId is used as AES-GCM Additional Authenticated Data (AAD),
 * cryptographically binding each encrypted blob to its product.
 *
 * @param plaintext - The source URL to encrypt
 * @param keyBase64url - Base64url-encoded 32-byte AES-256-GCM key from SatsRail
 * @param productId - SatsRail product UUID, used as AAD to bind the blob to this product
 * @returns Base64-encoded encrypted blob
 */
export function encryptSourceUrl(
  plaintext: string,
  keyBase64url: string,
  productId: string
): string {
  const keyBytes = base64urlDecode(keyBase64url);
  if (keyBytes.length !== 32) {
    throw new Error(`Key must be 32 bytes, got ${keyBytes.length}`);
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", keyBytes, iv);
  cipher.setAAD(Buffer.from(productId));

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: Base64(IV + ciphertext + authTag)
  const blob = Buffer.concat([iv, ciphertext, authTag]);
  return blob.toString("base64");
}

/**
 * Decrypt a media source URL blob using a SatsRail product key.
 *
 * The productId must match the AAD used during encryption, ensuring the
 * blob is only valid in the context of its original product.
 *
 * @param blobBase64 - Base64-encoded blob: IV[12] + ciphertext + authTag[16]
 * @param keyBase64url - Base64url-encoded 32-byte AES-256-GCM key from SatsRail
 * @param productId - SatsRail product UUID, used as AAD to verify the blob belongs to this product
 * @returns The plaintext source URL
 */
export function decryptSourceUrl(
  blobBase64: string,
  keyBase64url: string,
  productId: string
): string {
  const keyBytes = base64urlDecode(keyBase64url);
  if (keyBytes.length !== 32) {
    throw new Error(`Key must be 32 bytes, got ${keyBytes.length}`);
  }

  const raw = Buffer.from(blobBase64, "base64");
  if (raw.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Blob too short");
  }

  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(raw.length - TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH, raw.length - TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", keyBytes, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(productId));

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
