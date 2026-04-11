// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(),
}));

vi.mock("@/i18n/useLocale", async () => {
  const { t: realT } = await import("@/i18n");
  const boundT = (key: string, params?: Record<string, string | number>) => realT("en", key, params);
  return { useLocale: () => ({ t: boundT, locale: "en" }) };
});

vi.mock("@/components/ui/Modal", () => ({
  default: ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) => {
    if (!open) return null;
    return (
      <div data-testid="modal">
        {title && <h2>{title}</h2>}
        <button onClick={onClose} data-testid="modal-close">Close</button>
        {children}
      </div>
    );
  },
}));

vi.mock("swr", () => ({
  default: vi.fn(),
}));

import useSWR from "swr";
import ExchangeModal from "@/components/ExchangeModal";

const mockUseSWR = useSWR as ReturnType<typeof vi.fn>;

describe("ExchangeModal", () => {
  it("returns null when not open (via Modal mock)", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });
    const { container } = render(
      <ExchangeModal open={false} onClose={vi.fn()} />
    );
    expect(container.querySelector("[data-testid='modal']")).toBeNull();
  });

  it("renders loading state", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true });
    render(<ExchangeModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Get Bitcoin")).toBeInTheDocument();
    // Loading spinner exists
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).not.toBeNull();
  });

  it("renders exchanges list", () => {
    mockUseSWR.mockReturnValue({
      data: {
        exchanges: [
          { id: "ex1", name: "Strike", url: "https://strike.me", promoted: false, min_transaction_sats: null, notes: null, logo_url: null, countries: [] },
          { id: "ex2", name: "Coinbase", url: "https://coinbase.com", promoted: true, min_transaction_sats: 1000, notes: "US only", logo_url: "https://example.com/cb.png", countries: [] },
        ],
        country_code: "US",
      },
      isLoading: false,
    });

    render(<ExchangeModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Strike")).toBeInTheDocument();
    expect(screen.getByText("Coinbase")).toBeInTheDocument();
    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByText("US only")).toBeInTheDocument();
    expect(screen.getByText("Show all exchanges")).toBeInTheDocument();
  });

  it("renders exchange initial when no logo_url", () => {
    mockUseSWR.mockReturnValue({
      data: {
        exchanges: [
          { id: "ex1", name: "Strike", url: "https://strike.me", promoted: false, min_transaction_sats: null, notes: null, logo_url: null, countries: [] },
        ],
        country_code: null,
      },
      isLoading: false,
    });

    render(<ExchangeModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders exchange logo when logo_url exists", () => {
    mockUseSWR.mockReturnValue({
      data: {
        exchanges: [
          { id: "ex1", name: "Coinbase", url: "https://coinbase.com", promoted: false, min_transaction_sats: null, notes: null, logo_url: "https://example.com/logo.png", countries: [] },
        ],
        country_code: null,
      },
      isLoading: false,
    });

    render(<ExchangeModal open={true} onClose={vi.fn()} />);
    const img = document.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.src).toBe("https://example.com/logo.png");
  });

  it("renders empty state when no exchanges", () => {
    mockUseSWR.mockReturnValue({
      data: { exchanges: [], country_code: null },
      isLoading: false,
    });

    render(<ExchangeModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText("No exchanges available. Check back later.")).toBeInTheDocument();
  });

  it("does not show 'Show all' when no country_code", () => {
    mockUseSWR.mockReturnValue({
      data: {
        exchanges: [
          { id: "ex1", name: "Strike", url: "https://strike.me", promoted: false, min_transaction_sats: null, notes: null, logo_url: null, countries: [] },
        ],
        country_code: null,
      },
      isLoading: false,
    });

    render(<ExchangeModal open={true} onClose={vi.fn()} />);
    expect(screen.queryByText("Show all exchanges")).not.toBeInTheDocument();
  });

  it("shows country message when country_code is present", () => {
    mockUseSWR.mockReturnValue({
      data: {
        exchanges: [
          { id: "ex1", name: "Strike", url: "https://strike.me", promoted: false, min_transaction_sats: null, notes: null, logo_url: null, countries: [] },
        ],
        country_code: "US",
      },
      isLoading: false,
    });

    render(<ExchangeModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Showing exchanges available in your country/)).toBeInTheDocument();
  });

  it("hides 'Show all' button after clicking it", () => {
    mockUseSWR.mockReturnValue({
      data: {
        exchanges: [
          { id: "ex1", name: "Strike", url: "https://strike.me", promoted: false, min_transaction_sats: null, notes: null, logo_url: null, countries: [] },
        ],
        country_code: "US",
      },
      isLoading: false,
    });

    render(<ExchangeModal open={true} onClose={vi.fn()} />);
    const showAllBtn = screen.getByText("Show all exchanges");
    fireEvent.click(showAllBtn);
    // After clicking, showAll is true so the button hides
    expect(screen.queryByText("Show all exchanges")).not.toBeInTheDocument();
  });

  it("calls onClose via modal", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });
    const onClose = vi.fn();
    render(<ExchangeModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("modal-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
