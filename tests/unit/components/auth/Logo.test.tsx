// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Logo from "@/components/auth/Logo";

describe("Logo", () => {
  it("renders an img when logoUrl is provided", () => {
    render(<Logo logoUrl="/logo.png" instanceName="TestApp" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/logo.png");
    expect(img).toHaveAttribute("alt", "TestApp");
  });

  it("renders the first character fallback when logoUrl is empty", () => {
    render(<Logo logoUrl="" instanceName="MyApp" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("uses default theme when no theme provided", () => {
    render(<Logo logoUrl="" instanceName="App" />);
    const fallback = screen.getByText("A");
    expect(fallback.style.fontWeight).toBe("700");
  });

  it("uses custom theme when provided", () => {
    const customTheme = {
      color: {
        bg: "#000",
        card: "#111",
        accent: "#ff0000",
        accentLight: "#ff3333",
        accentGlow: "rgba(255,0,0,0.1)",
        white: "#00ff00",
        gray100: "#f0f0f0",
        gray300: "#b8b8b8",
        gray500: "#808080",
        gray700: "#222222",
        red: "#ee0000",
        green: "#00ee00",
        border: "rgba(255,255,255,0.06)",
      },
      font: {
        display: "'CustomDisplay', sans-serif",
        body: "'CustomBody', sans-serif",
      },
    };
    render(<Logo logoUrl="" instanceName="Themed" theme={customTheme} />);
    const fallback = screen.getByText("T");
    expect(fallback.style.color).toBe("rgb(0, 255, 0)"); // custom white
    expect(fallback.style.fontFamily).toContain("CustomDisplay");
  });
});
