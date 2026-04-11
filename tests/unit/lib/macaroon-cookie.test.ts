import { describe, it, expect } from "vitest";
import {
  parseMacaroonCookie,
  getStoredProductIds,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from "@/lib/macaroon-cookie";

describe("macaroon-cookie", () => {
  describe("parseMacaroonCookie", () => {
    it("returns empty object for undefined input", () => {
      expect(parseMacaroonCookie(undefined)).toEqual({});
    });

    it("returns empty object for empty string", () => {
      expect(parseMacaroonCookie("")).toEqual({});
    });

    it("returns empty object for malformed JSON", () => {
      expect(parseMacaroonCookie("{broken")).toEqual({});
    });

    it("parses a valid JSON cookie", () => {
      const raw = JSON.stringify({ "prod-1": "mac-a", "prod-2": "mac-b" });
      expect(parseMacaroonCookie(raw)).toEqual({
        "prod-1": "mac-a",
        "prod-2": "mac-b",
      });
    });

    it("handles a single-entry cookie", () => {
      const raw = JSON.stringify({ "prod-1": "mac-a" });
      expect(parseMacaroonCookie(raw)).toEqual({ "prod-1": "mac-a" });
    });
  });

  describe("getStoredProductIds", () => {
    it("returns empty array when cookie is undefined", () => {
      expect(getStoredProductIds(undefined, ["prod-1", "prod-2"])).toEqual([]);
    });

    it("returns empty array when no candidates match", () => {
      const raw = JSON.stringify({ "prod-x": "mac-x" });
      expect(getStoredProductIds(raw, ["prod-1", "prod-2"])).toEqual([]);
    });

    it("returns matching product IDs", () => {
      const raw = JSON.stringify({ "prod-1": "mac-a", "prod-3": "mac-c" });
      expect(
        getStoredProductIds(raw, ["prod-1", "prod-2", "prod-3"])
      ).toEqual(["prod-1", "prod-3"]);
    });

    it("returns all candidates when all match", () => {
      const raw = JSON.stringify({ "prod-1": "mac-a", "prod-2": "mac-b" });
      expect(getStoredProductIds(raw, ["prod-1", "prod-2"])).toEqual([
        "prod-1",
        "prod-2",
      ]);
    });

    it("returns empty array when candidate list is empty", () => {
      const raw = JSON.stringify({ "prod-1": "mac-a" });
      expect(getStoredProductIds(raw, [])).toEqual([]);
    });

    it("handles malformed cookie gracefully", () => {
      expect(getStoredProductIds("{bad", ["prod-1"])).toEqual([]);
    });

    it("excludes products with empty string macaroon values", () => {
      const raw = JSON.stringify({ "prod-1": "", "prod-2": "mac-b" });
      expect(getStoredProductIds(raw, ["prod-1", "prod-2"])).toEqual(["prod-2"]);
    });

    it("excludes products with null or undefined macaroon values", () => {
      const raw = JSON.stringify({ "prod-1": null, "prod-2": "mac-b" });
      expect(getStoredProductIds(raw, ["prod-1", "prod-2"])).toEqual(["prod-2"]);
    });
  });

  describe("constants", () => {
    it("exports the expected cookie name", () => {
      expect(COOKIE_NAME).toBe("satsrail_macaroons");
    });

    it("exports a 1-year max age", () => {
      expect(COOKIE_MAX_AGE).toBe(365 * 24 * 60 * 60);
    });
  });
});
