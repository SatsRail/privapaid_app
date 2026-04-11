// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Footer from "@/components/Footer";

describe("Footer", () => {
  it("renders nothing", () => {
    const { container } = render(<Footer />);
    expect(container.innerHTML).toBe("");
  });
});
