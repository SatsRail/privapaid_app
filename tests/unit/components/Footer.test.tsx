// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Footer from "@/components/Footer";

describe("Footer", () => {
  it("renders PrivaPaid attribution", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector("footer")).toBeTruthy();
    expect(container.querySelector('a[href="https://www.privapaid.com/"]')).toBeTruthy();
  });
});
