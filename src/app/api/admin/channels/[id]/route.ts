import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Channel from "@/models/Channel";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const channel = await Channel.findByIdAndUpdate(
    id,
    { active: false },
    { returnDocument: "after" }
  ).lean();
  if (!channel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: channel });
}
