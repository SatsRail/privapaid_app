import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Channel from "@/models/Channel";
import Media from "@/models/Media";
import MediaProduct from "@/models/MediaProduct";
import ChannelProduct from "@/models/ChannelProduct";
import { validateBody, isValidationError, schemas } from "@/lib/validate";
import { requireAdminApi } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { getMerchantKey } from "@/lib/merchant-key";
import { satsrail } from "@/lib/satsrail";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const channel = await Channel.findById(id)
    .populate("category_id", "name")
    .lean();
  if (!channel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: channel });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validated = await validateBody(req, schemas.channelUpdate);
  if (isValidationError(validated)) return validated;

  await connectDB();
  const { id } = await params;

  const updates: Record<string, unknown> = {};
  const fields = [
    "name", "slug", "bio", "category_id", "nsfw",
    "profile_image_url", "profile_image_id", "social_links", "active",
    "is_live", "stream_url",
  ] as const;
  for (const field of fields) {
    if (validated[field] !== undefined) updates[field] = validated[field];
  }

  // Check slug uniqueness
  if (updates.slug) {
    const existing = await Channel.findOne({
      slug: updates.slug,
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 422 });
    }
  }

  const channel = await Channel.findByIdAndUpdate(id, updates, { returnDocument: "after" })
    .populate("category_id", "name")
    .lean();

  if (!channel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: channel });
}

/**
 * Hard-delete a channel and cascade through all nested resources.
 *
 * Cascade order (mirrors single-media DELETE at /api/admin/media/[id]):
 *   1. Look up every MediaProduct + ChannelProduct under this channel
 *   2. Archive each linked SatsRail product (deleteProduct), tolerating per-product
 *      failures so a stuck product can't block the rest of the cleanup
 *   3. Delete MediaProduct rows
 *   4. Delete ChannelProduct rows
 *   5. Delete all Media rows
 *   6. Delete the Channel row
 *   7. Audit-log with the full list of archived/failed product ids
 *
 * If the merchant key is missing we still complete the local Mongo cleanup but
 * leave the SatsRail products intact (logged + reported in the audit entry).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  await connectDB();
  const { id } = await params;

  const channel = await Channel.findById(id).lean();
  if (!channel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mediaDocs = await Media.find({ channel_id: id })
    .select("_id name")
    .lean();
  const mediaIds = mediaDocs.map((m) => m._id);

  const mediaProducts = await MediaProduct.find({
    media_id: { $in: mediaIds },
  })
    .select("satsrail_product_id")
    .lean();

  const channelProducts = await ChannelProduct.find({ channel_id: id })
    .select("satsrail_product_id")
    .lean();

  const productIdsToArchive: string[] = [
    ...mediaProducts.map((mp) => mp.satsrail_product_id),
    ...channelProducts.map((cp) => cp.satsrail_product_id),
  ];

  const archivedProductIds: string[] = [];
  const archiveErrors: { productId: string; error: string }[] = [];

  if (productIdsToArchive.length > 0) {
    const sk = await getMerchantKey();
    if (!sk) {
      console.warn(
        "channel.delete: no merchant key — skipping SatsRail archive for products:",
        productIdsToArchive
      );
    } else {
      for (const productId of productIdsToArchive) {
        try {
          await satsrail.deleteProduct(sk, productId);
          archivedProductIds.push(productId);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error(
            `channel.delete: failed to archive SatsRail product ${productId}:`,
            message
          );
          archiveErrors.push({ productId, error: message });
        }
      }
    }
  }

  // Local cleanup — runs regardless of SatsRail success so we never end up with
  // dangling Mongo rows.
  if (mediaIds.length > 0) {
    await MediaProduct.deleteMany({ media_id: { $in: mediaIds } });
  }
  await ChannelProduct.deleteMany({ channel_id: id });
  await Media.deleteMany({ channel_id: id });
  await Channel.deleteOne({ _id: id });

  audit({
    actorId: auth.id,
    actorEmail: auth.email,
    actorType: "admin",
    action: "channel.delete",
    targetType: "channel",
    targetId: id,
    details: {
      name: channel.name,
      slug: channel.slug,
      ref: channel.ref,
      media_count: mediaDocs.length,
      channel_product_count: channelProducts.length,
      archived_product_ids: archivedProductIds,
      archive_errors: archiveErrors.length > 0 ? archiveErrors : undefined,
    },
  });

  return NextResponse.json({
    success: true,
    media_deleted: mediaDocs.length,
    archived_product_ids: archivedProductIds,
    archive_errors: archiveErrors.length > 0 ? archiveErrors : undefined,
  });
}
