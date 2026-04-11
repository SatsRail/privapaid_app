import { NextRequest, NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth-helpers";
import { getMerchantKey } from "@/lib/merchant-key";
import { satsrail } from "@/lib/satsrail";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

/**
 * GET /api/admin/products
 * List all SatsRail products for the merchant.
 */
export async function GET() {
  const authResult = await requireOwnerApi();
  if (authResult instanceof NextResponse) return authResult;

  const skLive = await getMerchantKey();
  if (!skLive) {
    return NextResponse.json(
      { error: "Merchant API key not configured" },
      { status: 422 }
    );
  }

  try {
    const result = await satsrail.listProducts(skLive);
    const active = result.data.filter((p) => p.status !== "archived");
    return NextResponse.json({ data: active });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list products";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * POST /api/admin/products
 * Create a product on SatsRail.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireOwnerApi();
  if (authResult instanceof NextResponse) return authResult;

  const result = await validateBody(req, schemas.productCreate);
  if (isValidationError(result)) return result;

  const skLive = await getMerchantKey();
  if (!skLive) {
    return NextResponse.json(
      { error: "Merchant API key not configured" },
      { status: 422 }
    );
  }

  try {
    const product = await satsrail.createProduct(skLive, result);
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create product";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
