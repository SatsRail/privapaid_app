import { ObjectId } from "mongodb";
import { getGridFSBucket } from "@/lib/gridfs";

/**
 * Fetch the raw logo image buffer from GridFS or an external URL.
 * Returns null if no logo is available.
 */
export async function getLogoBuffer(settings: {
  logo_image_id?: string;
  logo_url?: string;
}): Promise<Buffer | null> {
  if (settings.logo_image_id) {
    const bucket = await getGridFSBucket();
    const files = await bucket
      .find({ _id: new ObjectId(settings.logo_image_id) })
      .toArray();
    if (files.length === 0) return null;

    const stream = bucket.openDownloadStream(
      new ObjectId(settings.logo_image_id)
    );
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  if (settings.logo_url) {
    const res = await fetch(settings.logo_url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  return null;
}
