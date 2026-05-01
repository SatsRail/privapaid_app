import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import Channel from "@/models/Channel";
import MediaProduct from "@/models/MediaProduct";
import ChannelProduct from "@/models/ChannelProduct";
import { getInstanceConfig } from "@/config/instance";
import { getMerchantKey } from "@/lib/merchant-key";
import { satsrail } from "@/lib/satsrail";
import MediaForm from "../../MediaForm";
import DeleteMediaButton from "./DeleteMediaButton";

export const dynamic = "force-dynamic";

interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  currency: string;
  status: string;
  external_ref: string | null;
  has_blob: boolean;
  access_duration_seconds: number;
}

interface EncryptedBlobInfo {
  product_id: string;
  scope: "media" | "channel";
  blob_preview: string | null;
  blob_length: number;
  key_fingerprint: string | null;
  created_at: string | null;
}

function blobPreview(blob: string | undefined): string | null {
  return blob ? `${blob.slice(0, 24)}...${blob.slice(-8)}` : null;
}

function buildBlobIdsWithEncryption(
  mediaProducts: { satsrail_product_id: string; encrypted_source_url?: string }[],
  channelProductDocs: { satsrail_product_id: string; encrypted_media?: { media_id: unknown; encrypted_source_url?: string }[] }[],
  mediaId: string
): { mediaProductIds: Set<string>; channelProductIds: Set<string> } {
  const mediaProductIds = new Set(
    mediaProducts.filter((p) => !!p.encrypted_source_url).map((p) => p.satsrail_product_id)
  );
  const channelProductIds = new Set(
    channelProductDocs
      .filter((cp) =>
        cp.encrypted_media?.some(
          (em) => String(em.media_id) === String(mediaId) && !!em.encrypted_source_url
        )
      )
      .map((cp) => cp.satsrail_product_id)
  );
  return { mediaProductIds, channelProductIds };
}

async function fetchProductDetails(
  sk: string,
  allProductIds: string[],
  blobIds: { mediaProductIds: Set<string>; channelProductIds: Set<string> },
  mediaRef: number | null | undefined
): Promise<ProductDetail[]> {
  const res = await satsrail.listProducts(sk);
  const refPrefix = mediaRef != null ? `md_${mediaRef}` : null;
  const seen = new Set<string>();
  const details: ProductDetail[] = [];

  for (const p of res.data) {
    if (seen.has(p.id) || p.status === "archived") continue;

    const matchesRef = refPrefix && p.external_ref === refPrefix;
    const matchesLocal = allProductIds.includes(p.id);
    if (!matchesRef && !matchesLocal) continue;

    seen.add(p.id);
    details.push({
      id: p.id, slug: p.slug, name: p.name,
      price_cents: p.price_cents, currency: p.currency, status: p.status,
      external_ref: p.external_ref, access_duration_seconds: p.access_duration_seconds,
      has_blob: blobIds.mediaProductIds.has(p.id) || blobIds.channelProductIds.has(p.id),
    });
  }
  return details;
}

function buildEncryptedBlobs(
  mediaProducts: { satsrail_product_id: string; encrypted_source_url?: string; key_fingerprint?: string; created_at?: Date }[],
  channelProductDocs: { satsrail_product_id: string; encrypted_media?: { media_id: unknown; encrypted_source_url?: string }[]; key_fingerprint?: string; created_at?: Date }[],
  mediaId: string
): EncryptedBlobInfo[] {
  const blobs: EncryptedBlobInfo[] = [];

  for (const p of mediaProducts) {
    blobs.push({
      product_id: p.satsrail_product_id, scope: "media",
      blob_preview: blobPreview(p.encrypted_source_url),
      blob_length: p.encrypted_source_url?.length ?? 0,
      key_fingerprint: p.key_fingerprint || null,
      created_at: p.created_at ? new Date(p.created_at).toISOString() : null,
    });
  }

  for (const cp of channelProductDocs) {
    const entry = cp.encrypted_media?.find(
      (em: { media_id: unknown }) => String(em.media_id) === String(mediaId)
    );
    blobs.push({
      product_id: cp.satsrail_product_id, scope: "channel",
      blob_preview: blobPreview(entry?.encrypted_source_url),
      blob_length: entry?.encrypted_source_url?.length ?? 0,
      key_fingerprint: cp.key_fingerprint || null,
      created_at: cp.created_at ? new Date(cp.created_at).toISOString() : null,
    });
  }

  return blobs;
}

export default async function EditMediaPage({
  params,
}: {
  params: Promise<{ id: string; mediaId: string }>;
}) {
  const { id: channelId, mediaId } = await params;
  await connectDB();

  const [media, channel, instanceConfig] = await Promise.all([
    Media.findById(mediaId).lean(),
    Channel.findById(channelId).select("slug").lean(),
    getInstanceConfig(),
  ]);
  if (!media) notFound();

  const currency = instanceConfig.currency;

  const mediaProducts = await MediaProduct.find({ media_id: mediaId })
    .select("satsrail_product_id encrypted_source_url key_fingerprint created_at")
    .lean();

  const channelProductDocs = await ChannelProduct.find({
    channel_id: channelId,
    "encrypted_media.media_id": media._id,
  })
    .select("satsrail_product_id encrypted_media key_fingerprint created_at")
    .lean();

  const allProductIds = [
    ...mediaProducts.map((p) => p.satsrail_product_id),
    ...channelProductDocs.map((p) => p.satsrail_product_id),
  ];

  const blobIds = buildBlobIdsWithEncryption(mediaProducts, channelProductDocs, String(media._id));

  let productDetails: ProductDetail[] = [];
  const sk = await getMerchantKey();
  if (sk) {
    try {
      productDetails = await fetchProductDetails(sk, allProductIds, blobIds, media.ref);
    } catch {
      // SatsRail unreachable — show without product details
    }
  }

  const serialized = {
    _id: String(media._id),
    name: media.name,
    description: media.description || "",
    source_url: media.source_url,
    media_type: media.media_type,
    thumbnail_url: media.thumbnail_url || "",
    thumbnail_id: media.thumbnail_id || "",
    preview_image_ids: media.preview_image_ids || [],
    product_ids: [...new Set([...allProductIds, ...productDetails.map((p) => p.id)])],
  };

  const encryptedBlobs = buildEncryptedBlobs(mediaProducts, channelProductDocs, String(media._id));

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-2xl font-bold">Edit Media</h1>
        {media.ref != null && (
          <span className="rounded bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] px-2 py-0.5 font-mono text-xs text-[var(--theme-text-secondary)]">
            md_{media.ref}
          </span>
        )}
        <DeleteMediaButton
          mediaId={String(media._id)}
          channelId={channelId}
          name={media.name}
        />
      </div>
      <MediaForm
        channelId={channelId}
        channelSlug={channel?.slug}
        initialData={serialized}
        currency={currency}
        products={productDetails}
        encryptedBlobs={encryptedBlobs}
      />
    </div>
  );
}
