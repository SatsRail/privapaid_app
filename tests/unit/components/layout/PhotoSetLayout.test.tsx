// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { MediaPageData } from "@/app/c/[slug]/[mediaId]/types";

vi.mock("@/components/MediaBreadcrumb", () => ({
  default: (props: { mediaName: string }) => <div data-testid="breadcrumb">{props.mediaName}</div>,
}));
vi.mock("@/components/MediaHeader", () => ({
  default: (props: { name: string }) => <div data-testid="header">{props.name}</div>,
}));
vi.mock("@/components/UnavailableWall", () => ({
  default: (props: { variant: string }) => <div data-testid="unavailable-wall">{props.variant}</div>,
}));
vi.mock("@/components/PaymentWall", () => ({
  default: (props: { mediaId: string }) => <div data-testid="payment-wall">{props.mediaId}</div>,
}));
vi.mock("@/components/PreviewGallery", () => ({
  default: (props: { images: string[]; locked?: boolean; compact?: boolean }) => (
    <div data-testid="preview-gallery" data-locked={props.locked} data-compact={props.compact}>
      {props.images.length} images
    </div>
  ),
}));
vi.mock("@/components/CommentSection", () => ({
  default: (props: { mediaId: string }) => <div data-testid="comment-section">{props.mediaId}</div>,
}));
vi.mock("@/components/ErrorBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>,
}));
vi.mock("@/components/AdminPreviewBanner", () => ({
  default: (props: { mediaName: string }) => <div data-testid="admin-banner">{props.mediaName}</div>,
}));
vi.mock("@/components/AdminPreviewContent", () => ({
  default: (props: { mediaId: string }) => <div data-testid="admin-content">{props.mediaId}</div>,
}));

import PhotoSetLayout from "@/components/layout/PhotoSetLayout";

const baseData: MediaPageData = {
  media: {
    _id: "m1",
    name: "Photo Set",
    media_type: "photo_set",
    views_count: 5,
    comments_count: 2,
  },
  channel: { name: "Art Channel", slug: "art-channel" },
  products: [],
  storedProductIds: [],
  previewImages: ["/p1.jpg", "/p2.jpg"],
  thumbSrc: "/thumb.jpg",
  locale: "en",
  instanceConfig: { theme: {}, name: "TestInstance" },
};

describe("PhotoSetLayout", () => {
  it("renders breadcrumb, header, and comments", () => {
    render(<PhotoSetLayout {...baseData} />);
    expect(screen.getByTestId("breadcrumb")).toHaveTextContent("Photo Set");
    expect(screen.getByTestId("header")).toHaveTextContent("Photo Set");
    expect(screen.getByTestId("comment-section")).toHaveTextContent("m1");
  });

  it("shows UnavailableWall card variant when no products", () => {
    render(<PhotoSetLayout {...baseData} />);
    // Two instances: mobile (lg:hidden) + desktop (lg:block)
    const walls = screen.getAllByTestId("unavailable-wall");
    walls.forEach((wall) => expect(wall).toHaveTextContent("card"));
  });

  it("shows PaymentWall when products exist", () => {
    const data = {
      ...baseData,
      products: [{ productId: "p1", encryptedBlob: "blob" }],
    };
    render(<PhotoSetLayout {...data} />);
    const walls = screen.getAllByTestId("payment-wall");
    expect(walls.length).toBeGreaterThanOrEqual(1);
    walls.forEach((wall) => expect(wall).toHaveTextContent("m1"));
  });

  it("shows admin preview when adminPreviewSourceUrl is set", () => {
    const data = {
      ...baseData,
      adminPreviewSourceUrl: "https://example.com/preview",
      products: [{ productId: "p1", encryptedBlob: "blob" }],
    };
    render(<PhotoSetLayout {...data} />);
    expect(screen.getAllByTestId("admin-banner").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId("admin-content").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId("payment-wall")).not.toBeInTheDocument();
  });

  it("sets preview gallery locked when products exist and no admin preview", () => {
    const data = {
      ...baseData,
      products: [{ productId: "p1", encryptedBlob: "blob" }],
    };
    render(<PhotoSetLayout {...data} />);
    const gallery = screen.getByTestId("preview-gallery");
    expect(gallery.getAttribute("data-locked")).toBe("true");
  });

  it("sets preview gallery unlocked when no products", () => {
    render(<PhotoSetLayout {...baseData} />);
    const gallery = screen.getByTestId("preview-gallery");
    expect(gallery.getAttribute("data-locked")).toBe("false");
  });

  it("sets preview gallery unlocked during admin preview even with products", () => {
    const data = {
      ...baseData,
      adminPreviewSourceUrl: "https://example.com/preview",
      products: [{ productId: "p1", encryptedBlob: "blob" }],
    };
    render(<PhotoSetLayout {...data} />);
    const gallery = screen.getByTestId("preview-gallery");
    expect(gallery.getAttribute("data-locked")).toBe("false");
  });

  it("passes compact prop to preview gallery", () => {
    render(<PhotoSetLayout {...baseData} />);
    const gallery = screen.getByTestId("preview-gallery");
    expect(gallery.getAttribute("data-compact")).toBe("true");
  });

  it("does not render preview gallery when no images", () => {
    const data = { ...baseData, previewImages: [] };
    render(<PhotoSetLayout {...data} />);
    expect(screen.queryByTestId("preview-gallery")).not.toBeInTheDocument();
  });

  it("renders description when present", () => {
    const data = { ...baseData, media: { ...baseData.media, description: "Beautiful photos" } };
    render(<PhotoSetLayout {...data} />);
    expect(screen.getByText("Beautiful photos")).toBeInTheDocument();
  });
});
