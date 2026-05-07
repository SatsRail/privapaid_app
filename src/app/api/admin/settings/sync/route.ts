import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { requireOwnerApi } from "@/lib/auth-helpers";
import { clearConfigCache } from "@/config/instance";
import { getMerchantKey } from "@/lib/merchant-key";
import { satsrail } from "@/lib/satsrail";
import Settings from "@/models/Settings";
import MediaProduct from "@/models/MediaProduct";
import ChannelProduct from "@/models/ChannelProduct";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function syncProductCaches(secretKey: string): Promise<number> {
  let synced = 0;
  try {
    const productsResponse = await satsrail.listProducts(secretKey);
    const products = productsResponse.data || [];

    const productMap = new Map<string, Record<string, unknown>>();
    for (const p of products) {
      productMap.set(p.id, {
        product_name: p.name, product_price_cents: p.price_cents,
        product_currency: p.currency, product_access_duration_seconds: p.access_duration_seconds,
        product_status: p.status, product_slug: p.slug,
        product_external_ref: p.external_ref ?? null,
        synced_at: new Date(),
      });
    }

    const mediaProducts = await MediaProduct.find({}).select("satsrail_product_id").lean();
    for (const mp of mediaProducts) {
      const cached = productMap.get(mp.satsrail_product_id);
      if (cached) {
        await MediaProduct.updateOne({ _id: mp._id }, { $set: cached });
        synced++;
      }
    }

    const channelProducts = await ChannelProduct.find({}).select("satsrail_product_id").lean();
    for (const cp of channelProducts) {
      const cached = productMap.get(cp.satsrail_product_id);
      if (cached) {
        await ChannelProduct.updateOne({ _id: cp._id }, { $set: cached });
        synced++;
      }
    }
  } catch (productError) {
    console.error("Product sync error (non-fatal):", productError);
  }
  return synced;
}

export async function POST() {
  const authResult = await requireOwnerApi();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const secretKey = await getMerchantKey();
    if (!secretKey) {
      return NextResponse.json(
        { error: "No SatsRail API key configured" },
        { status: 400 }
      );
    }

    const merchant = await satsrail.getMerchant(secretKey);

    await connectDB();
    const settings = await Settings.findOne({ setup_completed: true })
      .select("logo_image_id")
      .lean();

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      merchant_name: merchant.name || "",
      merchant_currency: merchant.currency || "USD",
      merchant_locale: merchant.locale || "en",
    };

    // Only update logo_url if no custom logo was uploaded via GridFS
    if (!settings.logo_image_id) {
      updates.logo_url = merchant.logo_url || "";
    }

    await Settings.updateOne(
      { setup_completed: true },
      { $set: updates }
    );

    const productsSynced = await syncProductCaches(secretKey);

    audit({
      actorId: authResult.id,
      actorEmail: authResult.email,
      actorType: "admin",
      action: "settings.sync_merchant",
      targetType: "settings",
      details: { fields: Object.keys(updates), products_synced: productsSynced },
    });

    clearConfigCache();
    revalidatePath("/", "layout");

    return NextResponse.json({
      logo_url: settings.logo_image_id ? undefined : (merchant.logo_url || ""),
      merchant_name: merchant.name || "",
      products_synced: productsSynced,
      synced: true,
    });
  } catch (error) {
    console.error("Merchant sync error:", error);
    const message =
      error instanceof Error && error.message.includes("401")
        ? "Invalid API key. Check your SatsRail credentials."
        : "Failed to sync merchant data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
