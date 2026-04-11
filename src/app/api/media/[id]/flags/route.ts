import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getProductsForMedia } from "@/lib/access-gate";
import Flag from "@/models/Flag";
import Media from "@/models/Media";
import Customer from "@/models/Customer";
import { auth } from "@/lib/auth";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await validateBody(req, schemas.flagCreate);
  if (isValidationError(result)) return result;

  const { flag_type } = result;

  await connectDB();

  const media = await Media.findById(id);
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // Single source of truth: check both media-level and channel-level products
  const products = await getProductsForMedia(String(media._id), String(media.channel_id));
  const productIds = products.map((p) => p.productId);

  const customer = await Customer.findById(session.user.id)
    .select("purchases")
    .lean();
  const hasPurchase = customer?.purchases?.some(
    (p) => productIds.includes(p.satsrail_product_id)
  );

  if (!hasPurchase) {
    return NextResponse.json(
      { error: "Purchase required to flag content" },
      { status: 403 }
    );
  }

  // One flag per customer per media (enforced by unique index)
  const existing = await Flag.findOne({
    media_id: id,
    customer_id: session.user.id,
  });
  if (existing) {
    return NextResponse.json(
      { error: "Already flagged" },
      { status: 409 }
    );
  }

  await Flag.create({
    media_id: id,
    customer_id: session.user.id,
    flag_type: flag_type.trim(),
  });

  await Media.findByIdAndUpdate(id, { $inc: { flags_count: 1 } });

  return NextResponse.json({ ok: true }, { status: 201 });
}
