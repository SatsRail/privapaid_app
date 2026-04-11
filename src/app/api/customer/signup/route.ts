import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { validateBody, isValidationError, schemas } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const limited = await rateLimit("signup", 5);
    if (limited) return limited;

    const result = await validateBody(req, schemas.customerSignup);
    if (isValidationError(result)) return result;

    const { nickname, password } = result;

    await connectDB();

    const existing = await Customer.findOne({ nickname })
      .collation({ locale: "en", strength: 2 })
      .lean();
    if (existing) {
      return NextResponse.json(
        { error: "Nickname already taken" },
        { status: 409 }
      );
    }

    const password_hash = await bcrypt.hash(password, 12);

    try {
      const customer = await Customer.create({
        nickname,
        password_hash,
      });

      return NextResponse.json(
        { id: customer._id, nickname: customer.nickname },
        { status: 201 }
      );
    } catch (createErr: unknown) {
      // Handle race condition: unique index violation
      if (
        createErr &&
        typeof createErr === "object" &&
        "code" in createErr &&
        (createErr as { code: number }).code === 11000
      ) {
        return NextResponse.json(
          { error: "Nickname already taken" },
          { status: 409 }
        );
      }
      throw createErr;
    }
  } catch (err) {
    console.error("Customer signup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
