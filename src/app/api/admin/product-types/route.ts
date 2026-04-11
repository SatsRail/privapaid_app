import { NextRequest, NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth-helpers";
import { getMerchantKey } from "@/lib/merchant-key";
import { satsrail } from "@/lib/satsrail";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

/**
 * GET /api/admin/product-types
 * List all SatsRail product types for the merchant.
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
    const result = await satsrail.listProductTypes(skLive);
    return NextResponse.json({ data: result.data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list product types";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * POST /api/admin/product-types
 * Create a product type on SatsRail.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireOwnerApi();
  if (authResult instanceof NextResponse) return authResult;

  const result = await validateBody(req, schemas.productTypeCreate);
  if (isValidationError(result)) return result;

  const skLive = await getMerchantKey();
  if (!skLive) {
    return NextResponse.json(
      { error: "Merchant API key not configured" },
      { status: 422 }
    );
  }

  try {
    const productType = await satsrail.createProductType(skLive, { name: result.name });
    return NextResponse.json({ data: productType }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create product type";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
