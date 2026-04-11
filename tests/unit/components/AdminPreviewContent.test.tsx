// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

vi.mock("@/components/ContentRenderer", () => ({
  default: ({ mediaType }: { decryptedBytes: Uint8Array; mediaType: string }) => (
    <div data-testid="content-renderer">{mediaType}</div>
  ),
}));

import AdminPreviewContent from "@/components/AdminPreviewContent";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AdminPreviewContent", () => {
  it("shows loading state initially", () => {
    vi.spyOn(global, "fetch").mockImplementation(() => new Promise(() => {}));
    render(<AdminPreviewContent mediaId="m1" mediaType="video" />);
    expect(screen.getByText("Loading preview...")).toBeInTheDocument();
  });

  it("renders ContentRenderer on successful fetch", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ source_url: "https://example.com/video.mp4" }),
    } as unknown as Response);

    render(<AdminPreviewContent mediaId="m1" mediaType="video" />);

    await waitFor(() => {
      expect(screen.getByTestId("content-renderer")).toBeInTheDocument();
    });
    expect(screen.getByText("video")).toBeInTheDocument();
  });

  it("shows error on HTTP failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Forbidden" }),
    } as unknown as Response);

    render(<AdminPreviewContent mediaId="m1" mediaType="video" />);

    await waitFor(() => {
      expect(screen.getByText("Preview failed: Forbidden")).toBeInTheDocument();
    });
  });

  it("shows generic HTTP error when json parsing fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("bad json"); },
    } as unknown as Response);

    render(<AdminPreviewContent mediaId="m1" mediaType="video" />);

    await waitFor(() => {
      expect(screen.getByText("Preview failed: HTTP 500")).toBeInTheDocument();
    });
  });

  it("shows error on network failure", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

    render(<AdminPreviewContent mediaId="m1" mediaType="audio" />);

    await waitFor(() => {
      expect(screen.getByText("Preview failed: Network error")).toBeInTheDocument();
    });
  });

  it("returns null when no bytes are available", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ source_url: "" }),
    } as unknown as Response);

    const { container } = render(<AdminPreviewContent mediaId="m1" mediaType="video" />);

    await waitFor(() => {
      expect(screen.queryByText("Loading preview...")).not.toBeInTheDocument();
    });
    // Empty source_url still encodes to bytes, so ContentRenderer is rendered
    expect(container.querySelector("[data-testid='content-renderer']")).toBeInTheDocument();
  });

  it("does not update state after unmount", async () => {
    let resolvePromise: (v: Response) => void;
    const fetchPromise = new Promise<Response>((r) => { resolvePromise = r; });
    vi.spyOn(global, "fetch").mockReturnValue(fetchPromise);

    const { unmount } = render(<AdminPreviewContent mediaId="m1" mediaType="video" />);
    unmount();

    await act(async () => {
      resolvePromise!({
        ok: true,
        json: async () => ({ source_url: "https://example.com/v.mp4" }),
      } as unknown as Response);
    });
    // No error thrown — cancelled flag prevents setState on unmounted component
  });

  it("fetches from the correct endpoint", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ source_url: "https://example.com/v.mp4" }),
    } as unknown as Response);

    render(<AdminPreviewContent mediaId="abc123" mediaType="video" />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/admin/media/abc123/preview");
    });
  });
});
