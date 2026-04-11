import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Channel from "@/models/Channel";
import Media from "@/models/Media";
import MediaProduct from "@/models/MediaProduct";
import { requireAdminApi } from "@/lib/auth-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  await connectDB();
  const channel = await Channel.findOne({ _id: id, deleted_at: null }).lean();
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const media = await Media.find({ channel_id: id, deleted_at: null })
    .sort({ position: 1 })
    .lean();

  const mediaIds = media.map((m) => m._id);
  const mediaProducts = await MediaProduct.find({ media_id: { $in: mediaIds } }).lean();
  const productByMediaId = new Map(
    mediaProducts.map((mp) => [String(mp.media_id), mp])
  );

  const exportMedia = media.map((m) => {
    const mp = productByMediaId.get(String(m._id));
    const item: Record<string, unknown> = {
      ref: m.ref,
      name: m.name,
      description: m.description || "",
      source_url: m.source_url,
      media_type: m.media_type,
      thumbnail_url: m.thumbnail_url || "",
      position: m.position,
    };

    if (mp) {
      item.product = {
        name: mp.product_name || m.name,
        price_cents: mp.product_price_cents || 0,
        ...(mp.product_currency ? { currency: mp.product_currency } : {}),
        ...(mp.product_access_duration_seconds
          ? { access_duration_seconds: mp.product_access_duration_seconds }
          : {}),
      };
    }

    return item;
  });

  const payload = {
    version: "1.0" as const,
    media: exportMedia,
  };

  const filename = `channel-${channel.slug}-export.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
