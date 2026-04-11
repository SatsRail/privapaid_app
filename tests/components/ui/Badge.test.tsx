// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders with children text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("uses zinc color by default", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default").className).toContain("bg-zinc-100");
  });

  it("applies green color", () => {
    render(<Badge color="green">Success</Badge>);
    expect(screen.getByText("Success").className).toContain("bg-green-100");
  });

  it("applies red color", () => {
    render(<Badge color="red">Error</Badge>);
    expect(screen.getByText("Error").className).toContain("bg-red-100");
  });

  it("applies yellow color", () => {
    render(<Badge color="yellow">Warning</Badge>);
    expect(screen.getByText("Warning").className).toContain("bg-yellow-100");
  });

  it("applies custom className", () => {
    render(<Badge className="extra-class">Custom</Badge>);
    expect(screen.getByText("Custom").className).toContain("extra-class");
  });

  it("renders as a span element", () => {
    const { container } = render(<Badge>Test</Badge>);
    expect(container.querySelector("span")).toBeInTheDocument();
  });
});
