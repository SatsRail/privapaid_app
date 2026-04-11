// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PPButton from "@/components/auth/PPButton";

describe("PPButton", () => {
  it("renders children", () => {
    render(<PPButton>Click me</PPButton>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("renders as a button element", () => {
    render(<PPButton>Submit</PPButton>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("is not disabled by default", () => {
    render(<PPButton>Go</PPButton>);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("is disabled when disabled prop is true", () => {
    render(<PPButton disabled>Go</PPButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when loading is true", () => {
    render(<PPButton loading>Go</PPButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when both loading and disabled are true", () => {
    render(<PPButton loading disabled>Go</PPButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows spinner svg when loading", () => {
    const { container } = render(<PPButton loading>Loading</PPButton>);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("does not show spinner when not loading", () => {
    const { container } = render(<PPButton>Normal</PPButton>);
    const svg = container.querySelector("svg");
    expect(svg).toBeNull();
  });

  it("applies cursor not-allowed when disabled", () => {
    render(<PPButton disabled>Disabled</PPButton>);
    const btn = screen.getByRole("button");
    expect(btn.style.cursor).toBe("not-allowed");
    expect(btn.style.opacity).toBe("0.5");
  });

  it("applies cursor pointer when enabled", () => {
    render(<PPButton>Enabled</PPButton>);
    const btn = screen.getByRole("button");
    expect(btn.style.cursor).toBe("pointer");
    expect(btn.style.opacity).toBe("1");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<PPButton onClick={onClick}>Click</PPButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies hover styles on mouseEnter when not disabled", () => {
    render(<PPButton>Hover</PPButton>);
    const btn = screen.getByRole("button");
    fireEvent.mouseEnter(btn);
    expect(btn.style.transform).toBe("scale(1.02)");
  });

  it("does not apply hover styles when disabled", () => {
    render(<PPButton disabled>Hover</PPButton>);
    const btn = screen.getByRole("button");
    fireEvent.mouseEnter(btn);
    // Transform should not change to scale(1.02)
    expect(btn.style.transform).not.toBe("scale(1.02)");
  });

  it("resets styles on mouseLeave", () => {
    render(<PPButton>Leave</PPButton>);
    const btn = screen.getByRole("button");
    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);
    expect(btn.style.transform).toBe("scale(1)");
    expect(btn.style.boxShadow).toBe("none");
  });

  it("applies scale down on mouseDown when not disabled", () => {
    render(<PPButton>Press</PPButton>);
    const btn = screen.getByRole("button");
    fireEvent.mouseDown(btn);
    expect(btn.style.transform).toBe("scale(0.98)");
  });

  it("resets scale on mouseUp", () => {
    render(<PPButton>Release</PPButton>);
    const btn = screen.getByRole("button");
    fireEvent.mouseDown(btn);
    fireEvent.mouseUp(btn);
    expect(btn.style.transform).toBe("scale(1)");
  });

  it("forwards onMouseEnter callback", () => {
    const onMouseEnter = vi.fn();
    render(<PPButton onMouseEnter={onMouseEnter}>Btn</PPButton>);
    fireEvent.mouseEnter(screen.getByRole("button"));
    expect(onMouseEnter).toHaveBeenCalled();
  });

  it("forwards onMouseLeave callback", () => {
    const onMouseLeave = vi.fn();
    render(<PPButton onMouseLeave={onMouseLeave}>Btn</PPButton>);
    fireEvent.mouseLeave(screen.getByRole("button"));
    expect(onMouseLeave).toHaveBeenCalled();
  });

  it("forwards onMouseDown callback", () => {
    const onMouseDown = vi.fn();
    render(<PPButton onMouseDown={onMouseDown}>Btn</PPButton>);
    fireEvent.mouseDown(screen.getByRole("button"));
    expect(onMouseDown).toHaveBeenCalled();
  });

  it("forwards onMouseUp callback", () => {
    const onMouseUp = vi.fn();
    render(<PPButton onMouseUp={onMouseUp}>Btn</PPButton>);
    fireEvent.mouseUp(screen.getByRole("button"));
    expect(onMouseUp).toHaveBeenCalled();
  });
});
