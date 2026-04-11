import { NextRequest, NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth-helpers";
import { getMerchantKey } from "@/lib/merchant-key";
import { satsrail } from "@/lib/satsrail";
import { connectDB } from "@/lib/mongodb";
import MediaProduct from "@/models/MediaProduct";
import { decryptSourceUrl, encryptSourceUrl } from "@/lib/content-encryption";

/**
 * POST /api/admin/products/[id]/re-encrypt
 *
 * Re-encrypts all MediaProduct records for a product after key rotation.
 * Streams progress back to the client as newline-delimited JSON.
 *
 * Flow:
 *   1. Fetch product from SatsRail to get old_key
 *   2. Fetch current key from SatsRail
 *   3. For each MediaProduct: decrypt with old_key, re-encrypt with new key
 *   4. On success: clear old_key via SatsRail API
 *
 * Constraints:
 *   - No background workers — synchronous, admin-triggered
 *   - Only the encrypted source URL changes — content blobs are never touched
 *   - old_key is NOT cleared if any items fail (admin can retry)
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOwnerApi();
  if (authResult instanceof NextResponse) return authResult;

  const { id: productId } = await params;

  const skLive = await getMerchantKey();
  if (!skLive) {
    return NextResponse.json(
      { error: "Merchant API key not configured" },
      { status: 422 }
    );
  }

  // Fetch product to get old_key
  let oldKey: string;
  try {
    const product = await satsrail.getProduct(skLive, productId);
    if (!product.old_key) {
      return NextResponse.json(
        { error: "No key rotation pending for this product" },
        { status: 400 }
      );
    }
    oldKey = product.old_key;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch product";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Fetch current key
  let newKey: string;
  try {
    const keyData = await satsrail.getProductKey(skLive, productId);
    newKey = keyData.key;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch product key";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Find all MediaProducts for this product
  await connectDB();
  const mediaProducts = await MediaProduct.find({
    satsrail_product_id: productId,
  });

  const total = mediaProducts.length;

  if (total === 0) {
    // No media to re-encrypt — just clear old_key
    try {
      await satsrail.clearOldKey(skLive, productId);
    } catch (err) {
      console.error("Failed to clear old_key:", err);
    }
    return NextResponse.json({ done: true, total: 0, errors: 0 });
  }

  // Stream progress back to the client
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let errors = 0;
      let current = 0;

      for (const mp of mediaProducts) {
        current++;
        try {
          const plainUrl = decryptSourceUrl(mp.encrypted_source_url, oldKey, productId);
          const newBlob = encryptSourceUrl(plainUrl, newKey, productId);
          mp.encrypted_source_url = newBlob;
          await mp.save();
        } catch (err) {
          errors++;
          console.error(
            `Failed to re-encrypt media_product ${mp._id}:`,
            err
          );
        }

        controller.enqueue(
          encoder.encode(
            JSON.stringify({ current, total, errors }) + "\n"
          )
        );
      }

      // Only clear old_key if all items succeeded
      if (errors === 0) {
        try {
          await satsrail.clearOldKey(skLive, productId);
        } catch (err) {
          console.error("Failed to clear old_key:", err);
          errors++;
        }
      }

      controller.enqueue(
        encoder.encode(
          JSON.stringify({ done: true, total, errors }) + "\n"
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
