// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  font,
  color,
  privapaidTheme,
  buildAuthTheme,
} from "@/components/auth/theme";
import type { ThemeConfig } from "@/config/instance";

describe("auth/theme", () => {
  describe("font", () => {
    it("has display and body font families", () => {
      expect(font.display).toBe("'Space Grotesk', sans-serif");
      expect(font.body).toBe("'Inter', sans-serif");
    });
  });

  describe("color", () => {
    it("defines the default palette", () => {
      expect(color.bg).toBe("#08080d");
      expect(color.card).toBe("#111119");
      expect(color.accent).toBe("#c9506b");
      expect(color.white).toBe("#ffffff");
      expect(color.red).toBe("#f87171");
      expect(color.green).toBe("#34d399");
    });
  });

  describe("privapaidTheme", () => {
    it("bundles default color and font", () => {
      expect(privapaidTheme.color).toBe(color);
      expect(privapaidTheme.font).toBe(font);
    });
  });

  describe("buildAuthTheme", () => {
    const themeConfig: ThemeConfig = {
      primary: "#ff6600",
      bg: "#000000",
      bgSecondary: "#1a1a1a",
      text: "#eeeeee",
      textSecondary: "#999999",
      heading: "#dddddd",
      border: "rgba(255,255,255,0.1)",
      font: "Roboto",
      logo: "/logo.png",
    };

    it("maps ThemeConfig fields to AuthTheme color slots", () => {
      const theme = buildAuthTheme(themeConfig);
      expect(theme.color.bg).toBe("#000000");
      expect(theme.color.card).toBe("#1a1a1a");
      expect(theme.color.accent).toBe("#ff6600");
      expect(theme.color.white).toBe("#eeeeee");
      expect(theme.color.gray100).toBe("#dddddd");
      expect(theme.color.gray300).toBe("#999999");
      expect(theme.color.gray500).toBe("#999999");
      expect(theme.color.gray700).toBe("#1a1a1a");
      expect(theme.color.border).toBe("rgba(255,255,255,0.1)");
      // red and green are hardcoded
      expect(theme.color.red).toBe("#f87171");
      expect(theme.color.green).toBe("#34d399");
    });

    it("builds accentLight by lightening the primary color 20%", () => {
      const theme = buildAuthTheme(themeConfig);
      // #ff6600 lightened 20%:
      // R: min(255, round(255 + (255-255)*0.2)) = 255
      // G: min(255, round(102 + (255-102)*0.2)) = min(255, round(102+30.6)) = 133
      // B: min(255, round(0 + (255-0)*0.2)) = min(255, round(51)) = 51
      expect(theme.color.accentLight).toBe("#ff8533");
    });

    it("builds accentGlow as primary with 0.1 alpha", () => {
      const theme = buildAuthTheme(themeConfig);
      // #ff6600 -> rgba(255, 102, 0, 0.1)
      expect(theme.color.accentGlow).toBe("rgba(255, 102, 0, 0.1)");
    });

    it("wraps the theme font in quotes with sans-serif fallback", () => {
      const theme = buildAuthTheme(themeConfig);
      expect(theme.font.display).toBe("'Roboto', sans-serif");
      expect(theme.font.body).toBe("'Roboto', sans-serif");
    });

    it("handles a different primary color correctly", () => {
      const blueConfig: ThemeConfig = {
        ...themeConfig,
        primary: "#0066ff",
      };
      const theme = buildAuthTheme(blueConfig);
      expect(theme.color.accent).toBe("#0066ff");
      // Lighten #0066ff by 20%:
      // R: min(255, round(0 + 255*0.2)) = 51
      // G: min(255, round(102 + 153*0.2)) = min(255, round(132.6)) = 133
      // B: min(255, round(255 + 0*0.2)) = 255
      expect(theme.color.accentLight).toBe("#3385ff");
      expect(theme.color.accentGlow).toBe("rgba(0, 102, 255, 0.1)");
    });

    it("handles black primary (#000000)", () => {
      const blackConfig: ThemeConfig = {
        ...themeConfig,
        primary: "#000000",
      };
      const theme = buildAuthTheme(blackConfig);
      // Lighten #000000 by 20%: each channel = round(0 + 255*0.2) = 51 = 0x33
      expect(theme.color.accentLight).toBe("#333333");
      expect(theme.color.accentGlow).toBe("rgba(0, 0, 0, 0.1)");
    });

    it("handles white primary (#ffffff)", () => {
      const whiteConfig: ThemeConfig = {
        ...themeConfig,
        primary: "#ffffff",
      };
      const theme = buildAuthTheme(whiteConfig);
      // Lighten #ffffff by 20%: each channel = min(255, round(255 + 0*0.2)) = 255
      expect(theme.color.accentLight).toBe("#ffffff");
      expect(theme.color.accentGlow).toBe("rgba(255, 255, 255, 0.1)");
    });
  });
});
