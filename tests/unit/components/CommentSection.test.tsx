// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockMutate = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null })),
}));

vi.mock("swr", () => ({
  default: vi.fn(() => ({ data: [], mutate: mockMutate })),
}));

vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(),
}));

vi.mock("@/i18n/useLocale", async () => {
  const { t: realT } = await import("@/i18n");
  const boundT = (key: string, params?: Record<string, string | number>) => realT("en", key, params);
  return { useLocale: () => ({ t: boundT, locale: "en" }) };
});

vi.mock("@/components/ui/Button", () => ({
  default: ({ children, loading, type, size, ...props }: { children: React.ReactNode; loading?: boolean; type?: string; size?: string; "data-testid"?: string; onClick?: () => void }) => (
    <button {...props} data-loading={loading} data-type={type} data-size={size} data-testid="submit-btn">{children}</button>
  ),
}));

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import CommentSection from "@/components/CommentSection";
import { useSession } from "next-auth/react";
import useSWR from "swr";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  mockMutate.mockClear();
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({ data: null });
  (useSWR as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [], mutate: mockMutate });

  // Mock localStorage
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CommentSection", () => {
  it("renders comment count", () => {
    render(<CommentSection mediaId="m1" productIds={[]} />);
    expect(screen.getByText("Comments (0)")).toBeInTheDocument();
  });

  it("shows 'No comments yet.' when empty", () => {
    render(<CommentSection mediaId="m1" productIds={[]} />);
    expect(screen.getByText("No comments yet.")).toBeInTheDocument();
  });

  it("renders existing comments", () => {
    (useSWR as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        { _id: "c1", body: "Great!", created_at: "2025-01-01T00:00:00Z", customer: { nickname: "Alice" } },
      ],
      mutate: mockMutate,
    });

    render(<CommentSection mediaId="m1" productIds={[]} />);
    expect(screen.getByText("Great!")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows access-denied message when no access and has productIds", async () => {
    // macaroon check returns no access
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remaining_seconds: 0 }),
    });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByText(/Only paying viewers can comment/)).toBeInTheDocument();
    });
  });

  it("shows comment form when user has macaroon access", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remaining_seconds: 100 }),
    });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
    });
  });

  it("shows nickname field for anonymous (non-customer) users", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remaining_seconds: 100 }),
    });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Your nickname")).toBeInTheDocument();
    });
  });

  it("hides nickname field for customer users", async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { role: "customer", name: "Bob" } },
    });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remaining_seconds: 100 }),
    });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("Your nickname")).not.toBeInTheDocument();
  });

  it("shows customer form when isCustomer (no productIds needed for access)", async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { role: "customer", name: "Bob" } },
    });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remaining_seconds: 100 }),
    });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
    });
  });

  it("prevents submit with empty body", async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { role: "customer", name: "Bob" } },
    });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remaining_seconds: 100 }),
    });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
    });

    const form = screen.getByPlaceholderText("Share your thoughts...").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    // fetch should only have been called for macaroon check, not for comment POST
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("shows error when anonymous user submits without nickname", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remaining_seconds: 100 }),
    });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText("Share your thoughts...");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    const form = textarea.closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByText("Please enter a nickname")).toBeInTheDocument();
  });

  it("submits comment successfully", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ remaining_seconds: 100 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: "new1", body: "Hello", created_at: "2025-01-01", customer: { nickname: "Me" } }),
      });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
    });

    const nicknameInput = screen.getByPlaceholderText("Your nickname");
    fireEvent.change(nicknameInput, { target: { value: "Me" } });

    const textarea = screen.getByPlaceholderText("Share your thoughts...");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    const form = textarea.closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(mockMutate).toHaveBeenCalled();
    expect(localStorage.setItem).toHaveBeenCalledWith("privapaid_nickname", "Me");
  });

  it("handles server error on submit", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ remaining_seconds: 100 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Bad request" }),
      });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Your nickname"), { target: { value: "Me" } });
    fireEvent.change(screen.getByPlaceholderText("Share your thoughts..."), { target: { value: "Hi" } });

    const form = screen.getByPlaceholderText("Share your thoughts...").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByText("Bad request")).toBeInTheDocument();
  });

  it("handles server error without message", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ remaining_seconds: 100 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Your nickname"), { target: { value: "Me" } });
    fireEvent.change(screen.getByPlaceholderText("Share your thoughts..."), { target: { value: "Hi" } });

    const form = screen.getByPlaceholderText("Share your thoughts...").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByText("Failed to post comment")).toBeInTheDocument();
  });

  it("handles network error on submit", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ remaining_seconds: 100 }),
      })
      .mockRejectedValueOnce(new Error("Network"));

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Your nickname"), { target: { value: "Me" } });
    fireEvent.change(screen.getByPlaceholderText("Share your thoughts..."), { target: { value: "Hi" } });

    const form = screen.getByPlaceholderText("Share your thoughts...").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("handles macaroon check failure gracefully", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network"));

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    // After check fails, should show access denied
    await waitFor(() => {
      expect(screen.getByText(/Only paying viewers can comment/)).toBeInTheDocument();
    });
  });

  it("handles macaroon non-ok response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
    });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByText(/Only paying viewers can comment/)).toBeInTheDocument();
    });
  });

  it("loads nickname from localStorage on mount", async () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("SavedNick");
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ remaining_seconds: 100 }),
    });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Your nickname")).toHaveValue("SavedNick");
    });
  });

  it("skips form when no productIds (not pay-gated content)", () => {
    render(<CommentSection mediaId="m1" productIds={[]} />);
    expect(screen.queryByPlaceholderText("Share your thoughts...")).not.toBeInTheDocument();
    // No access-denied message either
    expect(screen.queryByText(/Only paying viewers/)).not.toBeInTheDocument();
  });

  it("checks multiple products and grants access on second", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ remaining_seconds: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ remaining_seconds: 50 }),
      });

    render(<CommentSection mediaId="m1" productIds={["p1", "p2"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
    });
  });

  it("submits comment without nickname for customer", async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { role: "customer", name: "Bob" } },
    });

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ remaining_seconds: 100 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: "c2", body: "Hey", created_at: "2025-01-01", customer: { nickname: "Bob" } }),
      });

    render(<CommentSection mediaId="m1" productIds={["p1"]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Share your thoughts..."), { target: { value: "Hey" } });

    const form = screen.getByPlaceholderText("Share your thoughts...").closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    // Should have posted without nickname
    const postCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    const postedBody = JSON.parse(postCall[1].body);
    expect(postedBody.body).toBe("Hey");
    expect(postedBody.nickname).toBeUndefined();
  });
});
