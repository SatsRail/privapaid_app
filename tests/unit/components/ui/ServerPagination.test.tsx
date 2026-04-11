// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import ServerPagination from "@/components/ui/ServerPagination";

describe("ServerPagination", () => {
  it("returns null when totalPages <= 1", () => {
    const { container } = render(
      <ServerPagination page={1} totalPages={1} baseUrl="/items" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders page info", () => {
    render(<ServerPagination page={2} totalPages={5} baseUrl="/items" />);
    expect(screen.getByText("2 of 5")).toBeInTheDocument();
  });

  it("renders Previous as disabled span on first page", () => {
    render(<ServerPagination page={1} totalPages={3} baseUrl="/items" />);
    const prev = screen.getByText("Previous");
    expect(prev.tagName).toBe("SPAN");
    expect(prev.className).toContain("opacity-50");
  });

  it("renders Previous as link on non-first page", () => {
    render(<ServerPagination page={2} totalPages={3} baseUrl="/items" />);
    const prev = screen.getByText("Previous");
    expect(prev.tagName).toBe("A");
    expect(prev).toHaveAttribute("href", "/items?page=1");
  });

  it("renders Next as disabled span on last page", () => {
    render(<ServerPagination page={3} totalPages={3} baseUrl="/items" />);
    const next = screen.getByText("Next");
    expect(next.tagName).toBe("SPAN");
    expect(next.className).toContain("opacity-50");
  });

  it("renders Next as link on non-last page", () => {
    render(<ServerPagination page={1} totalPages={3} baseUrl="/items" />);
    const next = screen.getByText("Next");
    expect(next.tagName).toBe("A");
    expect(next).toHaveAttribute("href", "/items?page=2");
  });

  it("includes search params in URLs", () => {
    render(
      <ServerPagination
        page={2}
        totalPages={5}
        baseUrl="/items"
        searchParams={{ sort: "name", q: "test" }}
      />
    );
    const prev = screen.getByText("Previous");
    const href = prev.getAttribute("href")!;
    expect(href).toContain("sort=name");
    expect(href).toContain("q=test");
    expect(href).toContain("page=1");
  });

  it("omits empty search param values", () => {
    render(
      <ServerPagination
        page={1}
        totalPages={3}
        baseUrl="/items"
        searchParams={{ sort: "name", q: "" }}
      />
    );
    const next = screen.getByText("Next");
    const href = next.getAttribute("href")!;
    expect(href).toContain("sort=name");
    expect(href).not.toContain("q=");
  });

  it("renders both links on middle page", () => {
    render(<ServerPagination page={2} totalPages={3} baseUrl="/items" />);
    const prev = screen.getByText("Previous");
    const next = screen.getByText("Next");
    expect(prev.tagName).toBe("A");
    expect(next.tagName).toBe("A");
  });
});
