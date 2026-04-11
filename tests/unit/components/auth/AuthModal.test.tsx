// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthModal from "@/components/auth/AuthModal";

describe("AuthModal", () => {
  it("renders children inside the modal", () => {
    render(
      <AuthModal>
        <p>Login form here</p>
      </AuthModal>
    );
    expect(screen.getByText("Login form here")).toBeInTheDocument();
  });

  it("renders backdrop and modal container", () => {
    const { container } = render(
      <AuthModal>
        <span>Content</span>
      </AuthModal>
    );
    // Backdrop is the first fixed div
    const fixedDivs = container.querySelectorAll('div[style*="position: fixed"]');
    expect(fixedDivs.length).toBeGreaterThanOrEqual(2); // backdrop + modal wrapper
  });

  it("uses default theme when no theme provided", () => {
    const { container } = render(
      <AuthModal>
        <span>Content</span>
      </AuthModal>
    );
    // The card div should use default card color
    const cardDiv = container.querySelector('div[style*="max-width"]');
    expect(cardDiv).not.toBeNull();
  });

  it("uses custom theme colors when provided", () => {
    const customTheme = {
      color: {
        bg: "#000",
        card: "#ff0000",
        accent: "#ff0000",
        accentLight: "#ff3333",
        accentGlow: "rgba(255,0,0,0.1)",
        white: "#fff",
        gray100: "#f0f0f0",
        gray300: "#b8b8b8",
        gray500: "#808080",
        gray700: "#222222",
        red: "#ee0000",
        green: "#00ee00",
        border: "rgba(255,0,0,0.06)",
      },
      font: {
        display: "'Custom', sans-serif",
        body: "'Custom', sans-serif",
      },
    };
    const { container } = render(
      <AuthModal theme={customTheme}>
        <span>Themed</span>
      </AuthModal>
    );
    const cardDiv = container.querySelector('div[style*="max-width"]');
    expect(cardDiv).not.toBeNull();
    expect((cardDiv as HTMLElement).style.background).toBe("rgb(255, 0, 0)");
  });
});
