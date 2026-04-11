import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Channel from "@/models/Channel";
import Category from "@/models/Category";
import config from "@/config/instance";
import ChannelForm from "../../ChannelForm";

export const dynamic = "force-dynamic";

export default async function EditChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connectDB();

  const [channel, categories] = await Promise.all([
    Channel.findById(id).lean(),
    Category.find({ active: true }).sort({ position: 1 }).select("name").lean(),
  ]);

  if (!channel) notFound();

  const cats = categories.map((c) => ({
    _id: String(c._id),
    name: c.name,
  }));

  const serialized = {
    _id: String(channel._id),
    name: channel.name,
    slug: channel.slug,
    bio: channel.bio || "",
    category_id: channel.category_id ? String(channel.category_id) : null,
    nsfw: channel.nsfw,
    profile_image_url: channel.profile_image_url || "",
    profile_image_id: channel.profile_image_id || "",
    social_links: (channel.social_links as Record<string, string>) || {},
    active: channel.active,
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-2xl font-bold">Edit Channel</h1>
        {channel.ref != null && (
          <span className="rounded bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] px-2 py-0.5 font-mono text-xs text-[var(--theme-text-secondary)]">
            ch_{channel.ref}
          </span>
        )}
      </div>
      <ChannelForm
        categories={cats}
        nsfwEnabled={config.nsfw}
        initialData={serialized}
      />
    </div>
  );
}
