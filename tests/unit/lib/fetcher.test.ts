import { describe, it, expect, vi } from "vitest";
import { fetcher } from "@/lib/fetcher";

describe("fetcher", () => {
  it("returns JSON for successful response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });
    const result = await fetcher("https://example.com/api");
    expect(result).toEqual({ data: "test" });
  });

  it("throws for non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    await expect(fetcher("https://example.com/api")).rejects.toThrow("Request failed: 404");
  });
});
