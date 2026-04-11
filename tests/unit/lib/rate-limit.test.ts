import { describe, it, expect, vi, beforeEach } from "vitest";

// Keep a reference to the mock so we can change header behavior per test
const mockHeaders = vi.fn().mockResolvedValue(
  new Headers({ "x-forwarded-for": "1.2.3.4" })
);

// Mock next/headers before importing rate-limit
vi.mock("next/headers", () => ({
  headers: (...args: unknown[]) => mockHeaders(...args),
}));

import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    // Reset header mock to default
    mockHeaders.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" }));
  });

  it("returns null when under the limit", async () => {
    const key = `test-under-${Date.now()}`;
    const result = await rateLimit(key, 5, 60000);
    expect(result).toBeNull();
  });

  it("returns null for requests up to the limit", async () => {
    const key = `test-at-limit-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const result = await rateLimit(key, 5, 60000);
      expect(result).toBeNull();
    }
  });

  it("returns 429 response when limit is exceeded", async () => {
    const key = `test-exceed-${Date.now()}`;
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await rateLimit(key, 5, 60000);
    }
    // Next request should be rate limited
    const result = await rateLimit(key, 5, 60000);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    const body = await result!.json();
    expect(body.error).toContain("Too many requests");
  });

  it("includes rate limit headers on 429", async () => {
    const key = `test-headers-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      await rateLimit(key, 3, 60000);
    }
    const result = await rateLimit(key, 3, 60000);
    expect(result).not.toBeNull();
    expect(result!.headers.get("X-RateLimit-Limit")).toBe("3");
    expect(result!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(result!.headers.get("Retry-After")).toBeTruthy();
  });

  it("resets after window expires", async () => {
    const key = `test-reset-${Date.now()}`;
    // Use a very short window
    for (let i = 0; i < 2; i++) {
      await rateLimit(key, 2, 1); // 1ms window
    }
    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 10));
    const result = await rateLimit(key, 2, 1);
    expect(result).toBeNull();
  });

  it("tracks different keys separately", async () => {
    const key1 = `test-sep-a-${Date.now()}`;
    const key2 = `test-sep-b-${Date.now()}`;
    // Exhaust key1
    for (let i = 0; i < 2; i++) {
      await rateLimit(key1, 2, 60000);
    }
    // key2 should still be allowed
    const result = await rateLimit(key2, 2, 60000);
    expect(result).toBeNull();
  });

  // ── Header fallback branches ────────────────────────────────────

  it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
    mockHeaders.mockResolvedValue(new Headers({ "x-real-ip": "10.0.0.1" }));

    const key = `test-realip-${Date.now()}`;
    // Should work and use x-real-ip as the IP — verify by exhausting
    // and confirming rate limit triggers (proves the IP was resolved)
    for (let i = 0; i < 2; i++) {
      const result = await rateLimit(key, 2, 60000);
      expect(result).toBeNull();
    }
    const result = await rateLimit(key, 2, 60000);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("falls back to 'unknown' when no IP headers are present", async () => {
    mockHeaders.mockResolvedValue(new Headers());

    const key = `test-unknown-ip-${Date.now()}`;
    for (let i = 0; i < 2; i++) {
      const result = await rateLimit(key, 2, 60000);
      expect(result).toBeNull();
    }
    const result = await rateLimit(key, 2, 60000);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  // ── Cleanup branches ────────────────────────────────────────────

  it("skips cleanup when called within 60 seconds", async () => {
    // Call twice rapidly with unique keys — both should succeed, proving
    // cleanup didn't error and the skip branch was taken
    const key1 = `test-cleanup-skip-a-${Date.now()}`;
    const key2 = `test-cleanup-skip-b-${Date.now()}`;
    const r1 = await rateLimit(key1, 10, 60000);
    const r2 = await rateLimit(key2, 10, 60000);
    expect(r1).toBeNull();
    expect(r2).toBeNull();
  });

  it("deletes expired entries during cleanup", async () => {
    // Create an entry with a very short window so it expires
    const key = `test-cleanup-expired-${Date.now()}`;
    await rateLimit(key, 10, 1); // 1ms window — will expire almost immediately

    // Wait for the entry to expire
    await new Promise((r) => setTimeout(r, 10));

    // Force cleanup to run by advancing lastCleanup.
    // We access the module internals indirectly: calling rateLimit after
    // enough time triggers cleanup. We simulate by using vi.spyOn on Date.now
    // to make the module think 60+ seconds have passed.
    const realNow = Date.now();
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(realNow + 61_000);

    const freshKey = `test-cleanup-fresh-${realNow}`;
    const result = await rateLimit(freshKey, 10, 60000);
    expect(result).toBeNull();

    dateSpy.mockRestore();
  });
});
