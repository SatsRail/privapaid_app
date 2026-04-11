// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/images", () => ({
  resolveImageUrl: (id?: string, url?: string) => {
    if (id) return `/api/images/${id}`;
    return url || "";
  },
}));

import { render, screen } from "@testing-library/react";
import ChannelCard from "@/components/ChannelCard";

const baseChannel = {
  _id: "ch1",
  slug: "my-channel",
  name: "My Channel",
  bio: "A great channel",
  profile_image_url: "/img.jpg",
  profile_image_id: "img1",
  media_count: 5,
  nsfw: false,
  theme: "default",
};

describe("ChannelCard", () => {
  it("renders channel name and bio", () => {
    render(<ChannelCard channel={baseChannel} />);
    expect(screen.getByText("My Channel")).toBeInTheDocument();
    expect(screen.getByText("A great channel")).toBeInTheDocument();
  });

  it("links to the channel slug", () => {
    render(<ChannelCard channel={baseChannel} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/c/my-channel");
  });

  it("renders profile image when available", () => {
    render(<ChannelCard channel={baseChannel} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/api/images/img1");
    expect(img).toHaveAttribute("alt", "My Channel");
  });

  it("renders initial fallback when no image", () => {
    const channel = { ...baseChannel, profile_image_url: "", profile_image_id: undefined };
    render(<ChannelCard channel={channel} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("shows media count", () => {
    render(<ChannelCard channel={baseChannel} />);
    expect(screen.getByText("5 media")).toBeInTheDocument();
  });

  it("shows NSFW badge when nsfw is true", () => {
    const channel = { ...baseChannel, nsfw: true };
    render(<ChannelCard channel={channel} />);
    expect(screen.getByText("NSFW")).toBeInTheDocument();
  });

  it("does not show NSFW badge when nsfw is false", () => {
    render(<ChannelCard channel={baseChannel} />);
    expect(screen.queryByText("NSFW")).toBeNull();
  });

  it("does not render bio when empty", () => {
    const channel = { ...baseChannel, bio: "" };
    render(<ChannelCard channel={channel} />);
    expect(screen.queryByText("A great channel")).toBeNull();
  });
});
