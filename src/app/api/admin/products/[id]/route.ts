import { NextRequest, NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth-helpers";
import { getMerchantKey } from "@/lib/merchant-key";
import { satsrail } from "@/lib/satsrail";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

/**
 * PATCH /api/admin/products/[id]
 * Update a product on SatsRail.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOwnerApi();
  if (authResult instanceof NextResponse) return authResult;

  const { id: productId } = await params;
  const result = await validateBody(req, schemas.productUpdate);
  if (isValidationError(result)) return result;

  const skLive = await getMerchantKey();
  if (!skLive) {
    return NextResponse.json(
      { error: "Merchant API key not configured" },
      { status: 422 }
    );
  }

  try {
    const product = await satsrail.updateProduct(skLive, productId, result);
    return NextResponse.json({ data: product });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update product";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * DELETE /api/admin/products/[id]
 * Delete (archive) a product on SatsRail.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOwnerApi();
  if (authResult instanceof NextResponse) return authResult;

  const { id: productId } = await params;

  const skLive = await getMerchantKey();
  if (!skLive) {
    return NextResponse.json(
      { error: "Merchant API key not configured" },
      { status: 422 }
    );
  }

  try {
    await satsrail.deleteProduct(skLive, productId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete product";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
