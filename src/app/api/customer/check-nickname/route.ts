import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";

export async function GET(req: NextRequest) {
  const nickname = req.nextUrl.searchParams.get("nickname");

  if (!nickname || nickname.length < 2) {
    return NextResponse.json({ available: false });
  }

  await connectDB();

  const existing = await Customer.findOne({ nickname })
    .collation({ locale: "en", strength: 2 })
    .lean();

  return NextResponse.json({ available: !existing });
}
