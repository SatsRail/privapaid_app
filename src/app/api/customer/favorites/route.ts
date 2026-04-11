import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { requireCustomerApi } from "@/lib/auth-helpers";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

export async function GET() {
  const session = await requireCustomerApi();
  if (session instanceof NextResponse) return session;

  await connectDB();
  const customer = await Customer.findById(session.id)
    .select("favorite_channel_ids")
    .lean();

  return NextResponse.json({
    favorite_channel_ids: customer?.favorite_channel_ids || [],
  });
}

export async function POST(req: NextRequest) {
  const session = await requireCustomerApi();
  if (session instanceof NextResponse) return session;

  const result = await validateBody(req, schemas.favorite);
  if (isValidationError(result)) return result;
  const { channel_id } = result;

  await connectDB();
  await Customer.findByIdAndUpdate(session.id, {
    $addToSet: { favorite_channel_ids: channel_id },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireCustomerApi();
  if (session instanceof NextResponse) return session;

  const result = await validateBody(req, schemas.favorite);
  if (isValidationError(result)) return result;
  const { channel_id } = result;

  await connectDB();
  await Customer.findByIdAndUpdate(session.id, {
    $pull: { favorite_channel_ids: channel_id },
  });

  return NextResponse.json({ ok: true });
}
