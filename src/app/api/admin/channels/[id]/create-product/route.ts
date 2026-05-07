import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Channel from "@/models/Channel";
import Media from "@/models/Media";
import ChannelProduct from "@/models/ChannelProduct";
import { getMerchantKey } from "@/lib/merchant-key";
import { encryptSourceUrl } from "@/lib/content-encryption";
import { satsrail } from "@/lib/satsrail";

/**
 * Create a SatsRail product for a channel and encrypt all media source URLs.
 *
 * Flow:
 * 1. Fetch channel and all its media, get global merchant key
 * 2. Create product on SatsRail with external_ref: ch_{channel.ref}, using channel's product type
 * 3. Fetch the product key from SatsRail
 * 4. Encrypt each media's source URL with the product key
 * 5. Store the ChannelProduct with the encrypted_media array
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id: channelId } = await params;
  const body = await req.json();

  const { name, price_cents, currency, access_duration_seconds, image_url } =
    body;
  if (!name || !price_cents) {
    return NextResponse.json(
      { error: "name and price_cents are required" },
      { status: 422 }
    );
  }

  const channel = await Channel.findById(channelId);
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (!channel.satsrail_product_type_id) {
    return NextResponse.json(
      {
        error:
          "Channel has no SatsRail product type. Re-create the channel or configure it manually.",
      },
      { status: 422 }
    );
  }

  if (channel.ref == null) {
    return NextResponse.json(
      { error: "Channel has no ref assigned" },
      { status: 422 }
    );
  }

  const skLive = await getMerchantKey();
  if (!skLive) {
    return NextResponse.json(
      { error: "Merchant API key not configured" },
      { status: 422 }
    );
  }

  try {
    // 1. Create product on SatsRail with ch_ external_ref
    const product = await satsrail.createProduct(skLive, {
      name,
      price_cents,
      currency,
      access_duration_seconds,
      image_url,
      product_type_id: channel.satsrail_product_type_id,
      external_ref: `ch_${channel.ref}`,
    });

    // 2. Fetch the encryption key
    const { key, key_fingerprint } = await satsrail.getProductKey(
      skLive,
      product.id
    );

    // 3. Encrypt all media source URLs
    const mediaItems = await Media.find({ channel_id: channelId })
      .select("_id source_url")
      .lean();

    const encrypted_media = mediaItems.map((m) => ({
      media_id: m._id,
      encrypted_source_url: encryptSourceUrl(m.source_url, key, product.id),
    }));

    // 4. Store the ChannelProduct with cached metadata
    const channelProduct = await ChannelProduct.create({
      channel_id: channelId,
      satsrail_product_id: product.id,
      key_fingerprint,
      encrypted_media,
      product_name: product.name,
      product_price_cents: product.price_cents,
      product_currency: product.currency,
      product_access_duration_seconds: product.access_duration_seconds,
      product_status: product.status,
      product_slug: product.slug,
      product_external_ref: product.external_ref ?? `ch_${channel.ref}`,
      synced_at: new Date(),
    });

    return NextResponse.json(
      {
        data: {
          channel_product: {
            id: String(channelProduct._id),
            satsrail_product_id: product.id,
            encrypted_media_count: encrypted_media.length,
          },
          product: {
            id: product.id,
            name: product.name,
            price_cents: product.price_cents,
            slug: product.slug,
          },
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create channel product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
