// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminPreviewBanner from "@/components/AdminPreviewBanner";

describe("AdminPreviewBanner", () => {
  it("renders the admin preview label", () => {
    render(<AdminPreviewBanner mediaName="Test Video" />);
    expect(screen.getByText("Admin Preview")).toBeInTheDocument();
  });

  it("renders the media name", () => {
    render(<AdminPreviewBanner mediaName="My Song" />);
    expect(screen.getByText(/My Song/)).toBeInTheDocument();
  });

  it("renders the eye icon svg", () => {
    const { container } = render(<AdminPreviewBanner mediaName="x" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute("width")).toBe("18");
  });
});
