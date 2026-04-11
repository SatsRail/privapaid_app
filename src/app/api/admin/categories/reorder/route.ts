import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";
import { requireAdminApi } from "@/lib/auth-helpers";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const result = await validateBody(req, schemas.reorder);
  if (isValidationError(result)) return result;

  await connectDB();

  const ops = result.items.map(
    (item: { id: string; position: number }) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { position: item.position },
      },
    })
  );

  await Category.bulkWrite(ops);
  return NextResponse.json({ success: true });
}
