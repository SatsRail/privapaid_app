import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import Settings from "@/models/Settings";
import { requireCustomerApi } from "@/lib/auth-helpers";
import { satsrail } from "@/lib/satsrail";
import { decryptSecretKey } from "@/lib/encryption";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

export async function GET() {
  const session = await requireCustomerApi();
  if (session instanceof NextResponse) return session;

  await connectDB();
  const customer = await Customer.findById(session.id)
    .select("purchases")
    .lean();

  return NextResponse.json({
    purchases: customer?.purchases || [],
  });
}

export async function POST(req: NextRequest) {
  const session = await requireCustomerApi();
  if (session instanceof NextResponse) return session;

  const result = await validateBody(req, schemas.customerPurchase);
  if (isValidationError(result)) return result;

  const { order_id, product_id } = result;

  await connectDB();

  const customer = await Customer.findById(session.id);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Check for duplicate purchase
  const alreadyPurchased = customer.purchases?.some(
    (p) => p.satsrail_product_id === product_id
  );
  if (alreadyPurchased) {
    return NextResponse.json({ error: "Already purchased" }, { status: 409 });
  }

  // Verify the order against SatsRail (skip for "from_checkout" — macaroon already verified)
  if (order_id !== "from_checkout") {
    try {
      const settings = await Settings.findOne({ setup_completed: true })
        .select("satsrail_api_key_encrypted satsrail_api_url")
        .lean();

      if (settings?.satsrail_api_key_encrypted) {
        const sk = decryptSecretKey(settings.satsrail_api_key_encrypted);
        const order = await satsrail.getOrder(sk, order_id);
        if (!order || order.status !== "paid") {
          return NextResponse.json(
            { error: "Order not verified" },
            { status: 403 }
          );
        }
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to verify order" },
        { status: 502 }
      );
    }
  }

  customer.purchases = customer.purchases || [];
  customer.purchases.push({
    satsrail_order_id: order_id,
    satsrail_product_id: product_id,
    purchased_at: new Date(),
  });
  await customer.save();

  return NextResponse.json({ ok: true }, { status: 201 });
}
