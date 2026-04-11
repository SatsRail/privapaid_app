// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockSetLocale = vi.fn();
let mockLocale = "en";

vi.mock("@/i18n/useLocale", async () => {
  const { t: realT } = await import("@/i18n");
  const boundT = (key: string, params?: Record<string, string | number>) =>
    realT("en", key, params);
  return {
    useLocale: () => ({
      t: boundT,
      locale: mockLocale,
      setLocale: mockSetLocale,
    }),
  };
});

import LanguageSwitcher from "@/components/LanguageSwitcher";

beforeEach(() => {
  mockSetLocale.mockClear();
  mockLocale = "en";
});

describe("LanguageSwitcher", () => {
  it("renders EN and ES buttons with a separator", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText("ES")).toBeInTheDocument();
    expect(screen.getByText("|")).toBeInTheDocument();
  });

  it("calls setLocale with 'en' when EN is clicked", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText("EN"));
    expect(mockSetLocale).toHaveBeenCalledWith("en");
  });

  it("calls setLocale with 'es' when ES is clicked", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText("ES"));
    expect(mockSetLocale).toHaveBeenCalledWith("es");
  });

  it("applies font-semibold to EN and opacity to ES when locale is en", () => {
    mockLocale = "en";
    render(<LanguageSwitcher />);
    const enButton = screen.getByText("EN");
    expect(enButton.className).toContain("font-semibold");

    const esButton = screen.getByText("ES");
    expect(esButton.className).toContain("opacity-50");
  });

  it("applies font-semibold to ES and opacity to EN when locale is es", () => {
    mockLocale = "es";
    render(<LanguageSwitcher />);
    const esButton = screen.getByText("ES");
    expect(esButton.className).toContain("font-semibold");

    const enButton = screen.getByText("EN");
    expect(enButton.className).toContain("opacity-50");
  });
});
