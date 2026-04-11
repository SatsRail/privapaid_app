import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import config from "@/config/instance";
import Channel from "@/models/Channel";
import Media from "@/models/Media";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  await connectDB();

  // Escape regex special characters
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  const channelFilter: Record<string, unknown> = {
    active: true,
    $or: [{ name: regex }, { bio: regex }, { slug: regex }],
  };
  if (!config.nsfw) {
    channelFilter.nsfw = false;
  }

  const [channels, mediaItems] = await Promise.all([
    Channel.find(channelFilter)
      .select("slug name profile_image_url profile_image_id")
      .limit(5)
      .lean(),
    Media.find({
      $or: [{ name: regex }, { description: regex }],
    })
      .select("name media_type channel_id thumbnail_url thumbnail_id")
      .limit(10)
      .lean(),
  ]);

  // Build channel slug lookup for media results
  const channelIds = [...new Set(mediaItems.map((m) => m.channel_id.toString()))];
  const mediaChannels = await Channel.find({
    _id: { $in: channelIds },
    active: true,
    ...(config.nsfw ? {} : { nsfw: false }),
  })
    .select("slug name")
    .lean();

  const slugMap = new Map<string, string>();
  for (const ch of mediaChannels) {
    slugMap.set(ch._id.toString(), ch.slug);
  }

  const results: Array<{
    type: "channel" | "media";
    id: string;
    name: string;
    slug: string;
    channelSlug?: string;
    mediaType?: string;
  }> = [];

  for (const ch of channels) {
    results.push({
      type: "channel",
      id: ch._id.toString(),
      name: ch.name,
      slug: ch.slug,
    });
  }

  for (const m of mediaItems) {
    const channelSlug = slugMap.get(m.channel_id.toString());
    if (!channelSlug) continue; // skip media from inactive/nsfw-hidden channels
    results.push({
      type: "media",
      id: m._id.toString(),
      name: m.name,
      slug: m._id.toString(),
      channelSlug,
      mediaType: m.media_type,
    });
  }

  return NextResponse.json({ results });
}
