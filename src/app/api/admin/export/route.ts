import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";
import Channel from "@/models/Channel";
import Media from "@/models/Media";
import MediaProduct from "@/models/MediaProduct";
import ChannelProduct from "@/models/ChannelProduct";
import { requireAdminApi } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  // Fetch all data
  const [categories, channels] = await Promise.all([
    Category.find().sort({ position: 1 }).lean(),
    Channel.find({ deleted_at: null }).populate("category_id", "slug").lean(),
  ]);

  // Fetch all media grouped by channel
  const channelIds = channels.map((ch) => ch._id);
  const allMedia = await Media.find({
    channel_id: { $in: channelIds },
    deleted_at: null,
  })
    .sort({ position: 1 })
    .lean();

  // Fetch all media products (using cached data — no SatsRail API dependency)
  const mediaIds = allMedia.map((m) => m._id);
  const mediaProducts = await MediaProduct.find({
    media_id: { $in: mediaIds },
  }).lean();

  const mediaProductMap = new Map<string, (typeof mediaProducts)[0]>();
  for (const mp of mediaProducts) {
    mediaProductMap.set(String(mp.media_id), mp);
  }

  // Fetch all channel products
  const channelProducts = await ChannelProduct.find({
    channel_id: { $in: channelIds },
  }).lean();

  const channelProductMap = new Map<string, (typeof channelProducts)[0]>();
  for (const cp of channelProducts) {
    channelProductMap.set(String(cp.channel_id), cp);
  }

  // Group media by channel
  const mediaByChannel = new Map<string, typeof allMedia>();
  for (const m of allMedia) {
    const key = String(m.channel_id);
    if (!mediaByChannel.has(key)) mediaByChannel.set(key, []);
    mediaByChannel.get(key)!.push(m);
  }

  // Assemble export JSON
  const exportData = {
    version: "1.0" as const,
    exported_at: new Date().toISOString(),
    categories: categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      position: cat.position,
      active: cat.active,
    })),
    channels: channels.map((ch) => {
      const channelMedia = mediaByChannel.get(String(ch._id)) || [];
      // After .populate("category_id", "slug"), category_id is either
      // a populated object { _id, slug } or the raw ObjectId string.
      const pop = ch.category_id as unknown as { slug: string } | null;
      const categorySlug = pop && typeof pop === "object" && "slug" in pop
        ? pop.slug
        : null;

      // Channel product from cached data
      const cp = channelProductMap.get(String(ch._id));

      return {
        ref: ch.ref,
        slug: ch.slug,
        name: ch.name,
        bio: ch.bio || "",
        category_slug: categorySlug || null,
        nsfw: ch.nsfw,
        social_links: ch.social_links || {},
        profile_image_url: ch.profile_image_url || "",
        active: ch.active,
        ...(cp?.product_name
          ? {
              product: {
                name: cp.product_name,
                price_cents: cp.product_price_cents ?? 0,
                currency: cp.product_currency || "USD",
                access_duration_seconds: cp.product_access_duration_seconds,
                external_ref: cp.product_external_ref || (ch.ref != null ? `ch_${ch.ref}` : undefined),
              },
            }
          : {}),
        media: channelMedia.map((m) => {
          const mp = mediaProductMap.get(String(m._id));

          return {
            ref: m.ref,
            name: m.name,
            description: m.description || "",
            source_url: m.source_url,
            media_type: m.media_type,
            thumbnail_url: m.thumbnail_url || "",
            preview_image_urls: m.preview_image_urls || [],
            position: m.position,
            ...(mp?.product_name
              ? {
                  product: {
                    name: mp.product_name,
                    price_cents: mp.product_price_cents ?? 0,
                    currency: mp.product_currency || "USD",
                    access_duration_seconds: mp.product_access_duration_seconds,
                    external_ref: mp.product_external_ref || (m.ref != null ? `md_${m.ref}` : undefined),
                  },
                }
              : {}),
          };
        }),
      };
    }),
  };

  audit({
    actorId: auth.id,
    actorEmail: auth.email,
    actorType: "admin",
    action: "export.create",
    targetType: "content",
    details: {
      categories: exportData.categories.length,
      channels: exportData.channels.length,
      media: exportData.channels.reduce((sum, ch) => sum + ch.media.length, 0),
    },
  });

  const dateStr = new Date().toISOString().split("T")[0];
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="privapaid-export-${dateStr}.json"`,
    },
  });
}
