import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Channel from "@/models/Channel";
import { getNextRef } from "@/models/Counter";
import { getMerchantKey } from "@/lib/merchant-key";
import { satsrail } from "@/lib/satsrail";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const categoryId = searchParams.get("category_id");

  const filter: Record<string, unknown> = { deleted_at: null };
  if (categoryId) filter.category_id = categoryId;

  const [channels, total] = await Promise.all([
    Channel.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("category_id", "name")
      .lean(),
    Channel.countDocuments(filter),
  ]);

  return NextResponse.json({
    data: channels,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const result = await validateBody(req, schemas.channelCreate);
  if (isValidationError(result)) return result;

  await connectDB();

  const { name } = result;
  const slug = result.slug || slugify(name);
  const existing = await Channel.findOne({ slug });
  if (existing) {
    return NextResponse.json(
      { error: "Slug already taken" },
      { status: 422 }
    );
  }

  const ref = await getNextRef("channel");

  // Create a product type on SatsRail for this channel
  let satsrailProductTypeId: string | null = null;
  const sk = await getMerchantKey();
  if (sk) {
    try {
      const productType = await satsrail.createProductType(sk, {
        name,
        external_ref: `ch_${ref}`,
      });
      satsrailProductTypeId = productType.id;
    } catch (err) {
      console.error("Failed to create SatsRail product type:", err);
    }
  }

  const channel = await Channel.create({
    ref,
    name,
    slug,
    satsrail_product_type_id: satsrailProductTypeId,
    bio: result.bio || "",
    category_id: result.category_id || undefined,
    nsfw: result.nsfw || false,
    profile_image_url: result.profile_image_url || "",
    profile_image_id: result.profile_image_id || "",
    social_links: result.social_links || {},
    active: true,
    media_count: 0,
  });

  return NextResponse.json({ data: channel.toObject() }, { status: 201 });
}
