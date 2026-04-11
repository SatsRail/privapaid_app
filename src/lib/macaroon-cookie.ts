/**
 * Shared macaroon cookie utilities.
 *
 * The `satsrail_macaroons` httpOnly cookie stores a JSON map of
 * `{ product_id: macaroon_string }`. These helpers parse and filter
 * that map so callers avoid duplicating the logic.
 */

export const COOKIE_NAME = "satsrail_macaroons";
export const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/**
 * Parse the raw cookie value into a product-id → macaroon map.
 * Returns an empty object on missing or malformed input.
 */
export function parseMacaroonCookie(
  raw: string | undefined
): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Return the subset of `candidateIds` that have a stored macaroon.
 * Used by the server component to tell PaymentWall which products
 * are worth verifying against SatsRail.
 */
export function getStoredProductIds(
  cookieValue: string | undefined,
  candidateIds: string[]
): string[] {
  const store = parseMacaroonCookie(cookieValue);
  return candidateIds.filter((id) => !!store[id]);
}
