import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";
import { requireAdminApi } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET() {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  await connectDB();
  const categories = await Category.find().sort({ position: 1 }).lean();
  return NextResponse.json({ data: categories });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const result = await validateBody(req, schemas.categoryCreate);
  if (isValidationError(result)) return result;

  await connectDB();

  const { name, position, active } = result;
  const slug = result.slug || slugify(name);

  const existing = await Category.findOne({ slug });
  if (existing) {
    return NextResponse.json(
      { error: "A category with this slug already exists" },
      { status: 422 }
    );
  }

  const maxPosition = await Category.findOne()
    .sort({ position: -1 })
    .select("position")
    .lean();

  const category = await Category.create({
    name: name.trim(),
    slug,
    position: position ?? (maxPosition?.position ?? 0) + 1,
    active: active ?? true,
  });

  audit({
    actorId: auth.id,
    actorEmail: auth.email,
    actorType: "admin",
    action: "category.create",
    targetType: "category",
    targetId: String(category._id),
    details: { name: category.name, slug: category.slug },
  });

  return NextResponse.json({ data: category }, { status: 201 });
}
