import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";
import { requireAdminApi } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  await connectDB();
  const { id } = await params;
  const category = await Category.findById(id).lean();
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: category });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  const result = await validateBody(req, schemas.categoryUpdate);
  if (isValidationError(result)) return result;

  await connectDB();
  const { id } = await params;

  const updates: Record<string, unknown> = {};
  if (result.name !== undefined) updates.name = result.name;
  if (result.slug !== undefined) updates.slug = result.slug;
  if (result.position !== undefined) updates.position = result.position;
  if (result.active !== undefined) updates.active = result.active;

  if (updates.slug) {
    const existing = await Category.findOne({
      slug: updates.slug,
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Slug already taken" },
        { status: 422 }
      );
    }
  }

  const category = await Category.findByIdAndUpdate(id, updates, {
    returnDocument: "after",
  }).lean();

  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  audit({
    actorId: auth.id,
    actorEmail: auth.email,
    actorType: "admin",
    action: "category.update",
    targetType: "category",
    targetId: id,
    details: { fields: Object.keys(updates) },
  });

  return NextResponse.json({ data: category });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  await connectDB();
  const { id } = await params;
  const category = await Category.findByIdAndUpdate(
    id,
    { active: false },
    { returnDocument: "after" }
  ).lean();
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  audit({
    actorId: auth.id,
    actorEmail: auth.email,
    actorType: "admin",
    action: "category.delete",
    targetType: "category",
    targetId: id,
  });

  return NextResponse.json({ data: category });
}
