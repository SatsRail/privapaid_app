// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/i18n", () => ({
  t: (_locale: string, key: string) => key,
}));

import MediaBreadcrumb from "@/components/MediaBreadcrumb";

describe("MediaBreadcrumb", () => {
  const defaultProps = {
    channelName: "Music Channel",
    channelSlug: "music-channel",
    mediaName: "My Song",
    locale: "en",
  };

  it("renders home link with correct href", () => {
    render(<MediaBreadcrumb {...defaultProps} />);
    const homeLink = screen.getByText("viewer.media.home");
    expect(homeLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders channel link with correct href", () => {
    render(<MediaBreadcrumb {...defaultProps} />);
    const channelLink = screen.getByText("Music Channel");
    expect(channelLink.closest("a")).toHaveAttribute("href", "/c/music-channel");
  });

  it("renders media name as plain text (not a link)", () => {
    render(<MediaBreadcrumb {...defaultProps} />);
    const mediaName = screen.getByText("My Song");
    expect(mediaName.tagName).toBe("SPAN");
    expect(mediaName.closest("a")).toBeNull();
  });

  it("renders separators between breadcrumb items", () => {
    const { container } = render(<MediaBreadcrumb {...defaultProps} />);
    expect(container.textContent).toContain(" / ");
  });
});
