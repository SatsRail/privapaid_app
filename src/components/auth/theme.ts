import type { ThemeConfig } from "@/config/instance";

export const font = {
  display: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
};

export const color = {
  bg: "#08080d",
  card: "#111119",
  accent: "#c9506b",
  accentLight: "#d4738a",
  accentGlow: "rgba(201, 80, 107, 0.10)",
  white: "#ffffff",
  gray100: "#f0f0f5",
  gray300: "#b8b8c8",
  gray500: "#80809a",
  gray700: "#222233",
  red: "#f87171",
  green: "#34d399",
  border: "rgba(255, 255, 255, 0.06)",
};

export interface AuthTheme {
  color: typeof color;
  font: typeof font;
}

export const privapaidTheme: AuthTheme = { color, font };

// --- Hex utilities ---

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildAuthTheme(tc: ThemeConfig): AuthTheme {
  return {
    color: {
      bg: tc.bg,
      card: tc.bgSecondary,
      accent: tc.primary,
      accentLight: lighten(tc.primary, 0.2),
      accentGlow: withAlpha(tc.primary, 0.1),
      white: tc.text,
      gray100: tc.heading,
      gray300: tc.textSecondary,
      gray500: tc.textSecondary,
      gray700: tc.bgSecondary,
      red: "#f87171",
      green: "#34d399",
      border: tc.border,
    },
    font: {
      display: `'${tc.font}', sans-serif`,
      body: `'${tc.font}', sans-serif`,
    },
  };
}
