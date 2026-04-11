import { NextResponse } from "next/server";
import { headers } from "next/headers";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean expired entries every 60 seconds
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

/**
 * Simple in-memory rate limiter.
 * Returns null if allowed, or a 429 NextResponse if rate limit exceeded.
 *
 * @param key - Unique identifier (e.g., "signup", "login")
 * @param limit - Max requests per window
 * @param windowMs - Window duration in milliseconds (default: 60s)
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): Promise<NextResponse | null> {
  cleanup();

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";

  const bucketKey = `${key}:${ip}`;
  const now = Date.now();

  let entry = store.get(bucketKey);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(bucketKey, entry);
  }

  entry.count++;

  const remaining = Math.max(0, limit - entry.count);
  const resetSec = Math.ceil((entry.resetAt - now) / 1000);

  if (entry.count > limit) {
    const res = NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
    res.headers.set("X-RateLimit-Limit", String(limit));
    res.headers.set("X-RateLimit-Remaining", "0");
    res.headers.set("X-RateLimit-Reset", String(resetSec));
    res.headers.set("Retry-After", String(resetSec));
    return res;
  }

  // Rate limit headers are added by the caller if needed
  return null;
}
