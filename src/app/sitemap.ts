import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/mongodb";
import { getInstanceConfig } from "@/config/instance";
import Channel from "@/models/Channel";
import Media from "@/models/Media";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();
  const { domain, nsfw } = await getInstanceConfig();
  const baseUrl = `https://${domain}`;

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  // Channels
  const channelFilter: Record<string, unknown> = { active: true };
  if (!nsfw) channelFilter.nsfw = false;

  const channels = await Channel.find(channelFilter)
    .select("slug updated_at")
    .lean();

  for (const channel of channels) {
    entries.push({
      url: `${baseUrl}/c/${channel.slug}`,
      lastModified: channel.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Media items for active channels
  const channelIds = channels.map((ch) => ch._id);
  const mediaItems = await Media.find({ channel_id: { $in: channelIds } })
    .select("_id channel_id updated_at")
    .lean();

  // Build channel slug lookup
  const slugMap = new Map(channels.map((ch) => [ch._id.toString(), ch.slug]));

  for (const media of mediaItems) {
    const slug = slugMap.get(media.channel_id.toString());
    if (!slug) continue;

    entries.push({
      url: `${baseUrl}/c/${slug}/${media._id}`,
      lastModified: media.updated_at,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
