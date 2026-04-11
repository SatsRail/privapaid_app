import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdminApi } from "@/lib/auth-helpers";
import MediaProduct from "@/models/MediaProduct";
import Media from "@/models/Media";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id: productId } = await params;
  await connectDB();

  const mediaProducts = await MediaProduct.find({ satsrail_product_id: productId }).lean();

  const mediaIds = mediaProducts.map((mp) => mp.media_id);
  const mediaItems = await Media.find({ _id: { $in: mediaIds } })
    .select("name media_type ref")
    .lean();

  const mediaMap = new Map(mediaItems.map((m) => [String(m._id), m]));

  const blobs = mediaProducts.map((mp) => {
    const media = mediaMap.get(String(mp.media_id));
    return {
      media_id: String(mp.media_id),
      media_name: media?.name || "Unknown",
      media_type: media?.media_type || "unknown",
      media_ref: media?.ref ?? null,
      blob_preview: mp.encrypted_source_url
        ? `${mp.encrypted_source_url.slice(0, 24)}...${mp.encrypted_source_url.slice(-8)}`
        : null,
      blob_length: mp.encrypted_source_url?.length ?? 0,
      key_fingerprint: mp.key_fingerprint || null,
      created_at: mp.created_at ? new Date(mp.created_at).toISOString() : null,
    };
  });

  return NextResponse.json({ data: blobs });
}
