import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseMacaroonCookie, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/macaroon-cookie";
import { verifySatsrailToken } from "@/lib/access-gate";

/**
 * POST /api/macaroons — Store a macaroon for a product
 * Body: { product_id, macaroon }
 */
export async function POST(req: NextRequest) {
  const { product_id, macaroon } = await req.json();
  if (!product_id || !macaroon) {
    return NextResponse.json({ error: "product_id and macaroon required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const existing = parseMacaroonCookie(cookieStore.get(COOKIE_NAME)?.value);
  existing[product_id] = macaroon;

  const response = NextResponse.json({ stored: true });
  response.cookies.set(COOKIE_NAME, JSON.stringify(existing), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}

/**
 * DELETE /api/macaroons — Remove a macaroon for a product
 * Body: { product_id }
 */
export async function DELETE(req: NextRequest) {
  const { product_id } = await req.json();
  if (!product_id) {
    return NextResponse.json({ error: "product_id required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const existing = parseMacaroonCookie(cookieStore.get(COOKIE_NAME)?.value);
  delete existing[product_id];

  const response = NextResponse.json({ removed: true });
  if (Object.keys(existing).length === 0) {
    response.cookies.delete(COOKIE_NAME);
  } else {
    response.cookies.set(COOKIE_NAME, JSON.stringify(existing), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }
  return response;
}

/**
 * PUT /api/macaroons — Verify a macaroon via SatsRail (server-side proxy)
 * Body: { product_id }
 * Returns the SatsRail verify response (key, remaining_seconds, etc.)
 */
export async function PUT(req: NextRequest) {
  const { product_id } = await req.json();
  if (!product_id) {
    return NextResponse.json({ error: "product_id required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const macaroons = parseMacaroonCookie(cookieStore.get(COOKIE_NAME)?.value);
  const macaroon = macaroons[product_id];

  if (!macaroon) {
    // Clean up empty/falsy entries left by previous bugs
    if (product_id in macaroons) {
      delete macaroons[product_id];
      const response = NextResponse.json({ error: "No macaroon found" }, { status: 404 });
      if (Object.keys(macaroons).length === 0) {
        response.cookies.delete(COOKIE_NAME);
      } else {
        response.cookies.set(COOKIE_NAME, JSON.stringify(macaroons), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: COOKIE_MAX_AGE,
        });
      }
      return response;
    }
    return NextResponse.json({ error: "No macaroon found" }, { status: 404 });
  }

  const result = await verifySatsrailToken(macaroon);

  if (result.status === "valid") {
    return NextResponse.json({
      key: result.key,
      key_fingerprint: result.keyFingerprint,
      remaining_seconds: result.remainingSeconds,
    });
  }

  if (result.status === "invalid") {
    // Portal definitively rejected the macaroon (HTTP 402) — it is either
    // expired or signature-invalid. Safe to clear it from the cookie.
    delete macaroons[product_id];
    const response = NextResponse.json({ error: "Access expired" }, { status: 410 });
    if (Object.keys(macaroons).length === 0) {
      response.cookies.delete(COOKIE_NAME);
    } else {
      response.cookies.set(COOKIE_NAME, JSON.stringify(macaroons), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
    }
    return response;
  }

  // status: "transient" — portal blip, network error, or surprising body.
  // Do NOT delete the cookie. The macaroon may still be valid; let the
  // client retry on next page load or heartbeat.
  return NextResponse.json({ error: "Verification temporarily unavailable" }, { status: 502 });
}
