// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockSession = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => mockSession(),
}));

import FavoriteButton from "@/components/FavoriteButton";

beforeEach(() => {
  mockSession.mockReturnValue({ data: { user: { role: "customer" } } });
  vi.stubGlobal("fetch", vi.fn());
});

describe("FavoriteButton", () => {
  it("returns null when no session", () => {
    mockSession.mockReturnValue({ data: null });
    const { container } = render(
      <FavoriteButton channelId="ch1" initialFavorited={false} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when user role is not customer", () => {
    mockSession.mockReturnValue({ data: { user: { role: "admin" } } });
    const { container } = render(
      <FavoriteButton channelId="ch1" initialFavorited={false} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders unfavorited state", () => {
    render(<FavoriteButton channelId="ch1" initialFavorited={false} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveTextContent("\u2661 Favorite");
    expect(btn).toHaveAttribute("aria-label", "Add to favorites");
  });

  it("renders favorited state", () => {
    render(<FavoriteButton channelId="ch1" initialFavorited={true} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveTextContent("\u2665 Favorited");
    expect(btn).toHaveAttribute("aria-label", "Remove from favorites");
  });

  it("sends POST when toggling from unfavorited", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<FavoriteButton channelId="ch1" initialFavorited={false} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/customer/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: "ch1" }),
      });
    });
  });

  it("sends DELETE when toggling from favorited", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<FavoriteButton channelId="ch1" initialFavorited={true} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/customer/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: "ch1" }),
      });
    });
  });

  it("toggles state on successful response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    render(<FavoriteButton channelId="ch1" initialFavorited={false} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("\u2665 Favorited");
    });
  });

  it("does not toggle state on failed response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });

    render(<FavoriteButton channelId="ch1" initialFavorited={false} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("\u2661 Favorite");
    });
  });

  it("does not toggle on network error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));

    render(<FavoriteButton channelId="ch1" initialFavorited={false} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("\u2661 Favorite");
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  it("disables button while loading", async () => {
    let resolvePromise: (val: unknown) => void;
    const promise = new Promise((resolve) => { resolvePromise = resolve; });
    (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

    render(<FavoriteButton channelId="ch1" initialFavorited={false} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toBeDisabled();

    resolvePromise!({ ok: true });
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });
});
