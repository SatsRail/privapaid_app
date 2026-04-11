import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireCustomerApi } from "@/lib/auth-helpers";
import Customer from "@/models/Customer";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

export async function GET() {
  const result = await requireCustomerApi();
  if (result instanceof NextResponse) return result;

  await connectDB();
  const customer = await Customer.findById(result.id)
    .select("-password_hash")
    .lean();

  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: customer });
}

export async function PATCH(req: NextRequest) {
  const session = await requireCustomerApi();
  if (session instanceof NextResponse) return session;

  const body = await validateBody(req, schemas.customerProfile);
  if (isValidationError(body)) return body;

  await connectDB();

  const updates: Record<string, unknown> = {};
  if (body.profile_image_id !== undefined) {
    updates.profile_image_id = body.profile_image_id;
  }

  const customer = await Customer.findByIdAndUpdate(session.id, updates, {
    returnDocument: "after",
  })
    .select("-password_hash")
    .lean();

  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: customer });
}
