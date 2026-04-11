// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PPInput from "@/components/auth/PPInput";

describe("PPInput", () => {
  it("renders label", () => {
    render(<PPInput label="Email" />);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders an input element", () => {
    render(<PPInput label="Name" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders helper text when no error", () => {
    render(<PPInput label="Email" helperText="Enter your email address" />);
    expect(screen.getByText("Enter your email address")).toBeInTheDocument();
  });

  it("renders error text", () => {
    render(<PPInput label="Email" error="Email is required" />);
    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });

  it("does not render helper text when error is present", () => {
    render(<PPInput label="Email" helperText="Enter email" error="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.queryByText("Enter email")).not.toBeInTheDocument();
  });

  it("does not render helper text or error when neither provided", () => {
    const { container } = render(<PPInput label="Email" />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(0);
  });

  it("passes through input props", () => {
    render(<PPInput label="Email" placeholder="you@example.com" type="email" />);
    const input = screen.getByPlaceholderText("you@example.com");
    expect(input).toHaveAttribute("type", "email");
  });

  it("calls onChange", () => {
    const onChange = vi.fn();
    render(<PPInput label="Name" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Alice" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("applies error border color when error present", () => {
    render(<PPInput label="Email" error="Required" />);
    const input = screen.getByRole("textbox");
    expect(input.style.borderColor).toContain("rgba(248, 113, 113");
  });

  it("handles focus and blur events", () => {
    render(<PPInput label="Email" />);
    const input = screen.getByRole("textbox");

    // Focus should update border style
    fireEvent.focus(input);
    expect(input.style.borderColor).toBeTruthy();

    // Blur should reset
    fireEvent.blur(input);
    expect(input.style.boxShadow).toBe("none");
  });

  it("handles focus with error state", () => {
    render(<PPInput label="Email" error="Required" />);
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    expect(input.style.borderColor).toContain("rgba(248, 113, 113");
  });

  it("handles blur with error state", () => {
    render(<PPInput label="Email" error="Required" />);
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input.style.borderColor).toContain("rgba(248, 113, 113");
    expect(input.style.boxShadow).toBe("none");
  });

  it("forwards onFocus callback", () => {
    const onFocus = vi.fn();
    render(<PPInput label="Test" onFocus={onFocus} />);
    fireEvent.focus(screen.getByRole("textbox"));
    expect(onFocus).toHaveBeenCalled();
  });

  it("forwards onBlur callback", () => {
    const onBlur = vi.fn();
    render(<PPInput label="Test" onBlur={onBlur} />);
    fireEvent.blur(screen.getByRole("textbox"));
    expect(onBlur).toHaveBeenCalled();
  });
});
