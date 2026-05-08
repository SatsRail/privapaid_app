import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Channel from "@/models/Channel";
import Media from "@/models/Media";
import MediaProduct from "@/models/MediaProduct";
import ChannelProduct from "@/models/ChannelProduct";
import Badge from "@/components/ui/Badge";
import { t } from "@/i18n";
import { getInstanceConfig } from "@/config/instance";
import { getMerchantKey } from "@/lib/merchant-key";
import { satsrail } from "@/lib/satsrail";
import ChannelProductSection from "./ChannelProductSection";
import ChannelImportSection from "./ChannelImportSection";
import ChannelSamplerPreview from "./ChannelSamplerPreview";
import DeleteChannelButton from "./DeleteChannelButton";

export const dynamic = "force-dynamic";

export default async function ChannelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { locale, currency } = await getInstanceConfig();
  await connectDB();

  const channel = await Channel.findById(id)
    .populate("category_id", "name")
    .lean();
  if (!channel) notFound();

  const media = await Media.find({ channel_id: id })
    .sort({ position: 1 })
    .lean();

  const cat = channel.category_id as { name?: string } | null;

  // Fetch media-level product associations
  const mediaIds = media.map((m) => m._id);
  const mediaProducts = await MediaProduct.find({ media_id: { $in: mediaIds } })
    .select("media_id")
    .lean();
  const mediaWithProduct = new Set(
    mediaProducts.map((mp) => String(mp.media_id))
  );

  // Fetch channel-level products
  const channelProductDocs = await ChannelProduct.find({ channel_id: id })
    .select("satsrail_product_id encrypted_media")
    .lean();

  // Build a set of media IDs covered by channel products
  const mediaCoveredByChannel = new Set<string>();
  for (const cp of channelProductDocs) {
    for (const em of cp.encrypted_media) {
      mediaCoveredByChannel.add(String(em.media_id));
    }
  }

  // Fetch channel product details from SatsRail for display
  interface ChannelProductData {
    satsrail_product_id: string;
    name: string;
    price_cents: number;
    currency: string;
    status: string;
    encrypted_media_count: number;
  }

  let channelProducts: ChannelProductData[] = [];
  if (channelProductDocs.length > 0) {
    const sk = await getMerchantKey();
    if (sk && channel.ref != null) {
      try {
        const res = await satsrail.listProducts(sk, {
          external_ref_eq: `ch_${channel.ref}`,
        });
        const satsrailProductMap = new Map(
          res.data.map((p) => [p.id, p])
        );

        channelProducts = channelProductDocs
          .map((doc) => {
            const sp = satsrailProductMap.get(doc.satsrail_product_id);
            if (!sp) return null;
            return {
              satsrail_product_id: doc.satsrail_product_id,
              name: sp.name,
              price_cents: sp.price_cents,
              currency: sp.currency,
              status: sp.status,
              encrypted_media_count: doc.encrypted_media.length,
            };
          })
          .filter((p): p is ChannelProductData => p !== null);
      } catch {
        // SatsRail unreachable — show local data only
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{channel.name}</h1>
            {channel.ref != null && (
              <span className="rounded bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] px-2 py-0.5 font-mono text-xs text-[var(--theme-text-secondary)]">
                ch_{channel.ref}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--theme-text-secondary)]">
            /{channel.slug} · {cat?.name || t(locale, "admin.channels.no_category")} ·{" "}
            <Badge color={channel.active ? "green" : "red"}>
              {channel.active ? t(locale, "admin.channels.active") : t(locale, "admin.channels.inactive")}
            </Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/channels/${id}/edit`}
            className="rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t(locale, "admin.channels.edit")}
          </Link>
          <DeleteChannelButton
            channelId={id}
            name={channel.name}
            mediaCount={media.length}
          />
        </div>
      </div>

      {/* Channel Products Section */}
      <ChannelProductSection
        channelId={id}
        products={channelProducts}
        currency={currency || "USD"}
        mediaCount={media.length}
      />

      {/* Channel Import/Export */}
      <ChannelImportSection channelId={id} />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t(locale, "admin.channels.media")} ({media.length})</h2>
        <Link
          href={`/admin/channels/${id}/media/new`}
          className="rounded-md border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-3 py-1.5 text-sm hover:opacity-80"
        >
          {t(locale, "admin.channels.add_media")}
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--theme-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--theme-bg-secondary)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">#</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">Ref</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">{t(locale, "admin.channels.name")}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">{t(locale, "admin.channels.type")}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">Product</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--theme-text-secondary)]">{t(locale, "admin.channels.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--theme-border)]">
            {media.map((m) => {
              const mId = String(m._id);
              const hasIndividual = mediaWithProduct.has(mId);
              const hasChannel = mediaCoveredByChannel.has(mId);

              return (
                <tr key={mId} className="hover:bg-[var(--theme-bg-secondary)]">
                  <td className="px-4 py-3 text-[var(--theme-text-secondary)]">{m.position}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-secondary)]">
                    {m.ref != null ? `md_${m.ref}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3">
                    <Badge>{m.media_type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {hasChannel && (
                        <Badge color="green">Channel</Badge>
                      )}
                      {hasIndividual && (
                        <Badge color="blue">Individual</Badge>
                      )}
                      {!hasChannel && !hasIndividual && (
                        <span className="text-[var(--theme-text-secondary)]">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/channels/${id}/media/${m._id}/edit`}
                      className="text-[var(--theme-primary)] hover:underline"
                    >
                      {t(locale, "admin.channels.edit")}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {media.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-[var(--theme-text-secondary)]">
                  {t(locale, "admin.channels.media_empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {media.length === 0 && <ChannelSamplerPreview channelId={id} />}
    </div>
  );
}
