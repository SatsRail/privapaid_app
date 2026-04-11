import { connectDB } from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { decryptSecretKey } from "@/lib/encryption";

/**
 * Get the decrypted merchant sk_live_ key from Settings.
 * Returns null if no key is configured.
 */
export async function getMerchantKey(): Promise<string | null> {
  await connectDB();
  const settings = await Settings.findOne().select("satsrail_api_key_encrypted").lean();

  if (!settings?.satsrail_api_key_encrypted) {
    return null;
  }

  return decryptSecretKey(settings.satsrail_api_key_encrypted);
}
