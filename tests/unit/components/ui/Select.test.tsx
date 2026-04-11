// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Select from "@/components/ui/Select";

const options = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C" },
];

describe("Select", () => {
  it("renders options", () => {
    render(<Select options={options} />);
    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
    expect(screen.getByText("Option C")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<Select options={options} label="Category" />);
    expect(screen.getByText("Category")).toBeInTheDocument();
    const select = screen.getByRole("combobox");
    expect(select).toHaveAttribute("id", "category");
  });

  it("does not render label when not provided", () => {
    const { container } = render(<Select options={options} />);
    expect(container.querySelector("label")).toBeNull();
  });

  it("renders placeholder as disabled option", () => {
    render(<Select options={options} placeholder="Select one" />);
    const placeholder = screen.getByText("Select one");
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveAttribute("disabled");
    expect(placeholder).toHaveAttribute("value", "");
  });

  it("does not render placeholder when not provided", () => {
    render(<Select options={options} />);
    const allOptions = screen.getAllByRole("option");
    expect(allOptions).toHaveLength(3);
  });

  it("renders error message", () => {
    render(<Select options={options} error="Required field" />);
    expect(screen.getByText("Required field")).toBeInTheDocument();
  });

  it("applies error border class when error exists", () => {
    render(<Select options={options} error="Bad" />);
    const select = screen.getByRole("combobox");
    expect(select.className).toContain("border-red-500");
  });

  it("does not show error styling when no error", () => {
    render(<Select options={options} />);
    const select = screen.getByRole("combobox");
    expect(select.className).not.toContain("border-red-500");
  });

  it("uses custom id when provided", () => {
    render(<Select options={options} label="Test" id="custom-id" />);
    const select = screen.getByRole("combobox");
    expect(select).toHaveAttribute("id", "custom-id");
  });

  it("passes additional className", () => {
    render(<Select options={options} className="extra-class" />);
    const select = screen.getByRole("combobox");
    expect(select.className).toContain("extra-class");
  });

  it("fires onChange", () => {
    const onChange = vi.fn();
    render(<Select options={options} onChange={onChange} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "b" } });
    expect(onChange).toHaveBeenCalled();
  });
});
