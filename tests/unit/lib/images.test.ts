import { describe, it, expect } from "vitest";
import { resolveImageUrl } from "@/lib/images";

describe("resolveImageUrl", () => {
  it("returns API path when imageId is provided", () => {
    expect(resolveImageUrl("abc123")).toBe("/api/images/abc123");
  });

  it("prefers imageId over imageUrl", () => {
    expect(resolveImageUrl("abc123", "https://example.com/img.jpg")).toBe("/api/images/abc123");
  });

  it("returns imageUrl when no imageId", () => {
    expect(resolveImageUrl(undefined, "https://example.com/img.jpg")).toBe("https://example.com/img.jpg");
  });

  it("returns empty string when neither provided", () => {
    expect(resolveImageUrl()).toBe("");
    expect(resolveImageUrl(undefined, undefined)).toBe("");
  });
});
