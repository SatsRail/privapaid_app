import { describe, it, expect } from "vitest";
import { getImageSrc } from "@/lib/image-utils";

describe("getImageSrc", () => {
  it("returns API path when imageId is provided", () => {
    expect(getImageSrc("abc123")).toBe("/api/images/abc123");
  });

  it("prefers imageId over imageUrl", () => {
    expect(getImageSrc("abc123", "https://example.com/img.jpg")).toBe("/api/images/abc123");
  });

  it("returns imageUrl when no imageId", () => {
    expect(getImageSrc(undefined, "https://example.com/img.jpg")).toBe("https://example.com/img.jpg");
  });

  it("returns null when neither provided", () => {
    expect(getImageSrc()).toBeNull();
    expect(getImageSrc(undefined, undefined)).toBeNull();
  });

  it("returns null for empty strings", () => {
    expect(getImageSrc("", "")).toBeNull();
    expect(getImageSrc("", undefined)).toBeNull();
  });
});
