// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Toast from "@/components/ui/Toast";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Toast", () => {
  it("renders message", () => {
    render(<Toast message="Saved!" onClose={vi.fn()} />);
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("renders close button", () => {
    render(<Toast message="Hello" onClose={vi.fn()} />);
    // The close button contains the x character
    const closeBtn = screen.getByRole("button");
    expect(closeBtn).toBeInTheDocument();
  });

  it("calls onClose after duration expires", () => {
    const onClose = vi.fn();
    render(<Toast message="Timed" duration={3000} onClose={onClose} />);

    act(() => { vi.advanceTimersByTime(3000); });
    // After visibility fades, onClose fires after 200ms
    act(() => { vi.advanceTimersByTime(200); });
    expect(onClose).toHaveBeenCalled();
  });

  it("uses default duration of 4000ms", () => {
    const onClose = vi.fn();
    render(<Toast message="Default" onClose={onClose} />);

    act(() => { vi.advanceTimersByTime(3999); });
    expect(onClose).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    act(() => { vi.advanceTimersByTime(200); });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<Toast message="Closeable" onClose={onClose} />);

    fireEvent.click(screen.getByRole("button"));
    // After 200ms fade
    act(() => { vi.advanceTimersByTime(200); });
    expect(onClose).toHaveBeenCalled();
  });

  it("applies success color classes", () => {
    const { container } = render(<Toast message="OK" type="success" onClose={vi.fn()} />);
    const toast = container.firstChild as HTMLElement;
    expect(toast.className).toContain("bg-green-50");
  });

  it("applies error color classes", () => {
    const { container } = render(<Toast message="Fail" type="error" onClose={vi.fn()} />);
    const toast = container.firstChild as HTMLElement;
    expect(toast.className).toContain("bg-red-50");
  });

  it("applies info color classes by default", () => {
    const { container } = render(<Toast message="Info" onClose={vi.fn()} />);
    const toast = container.firstChild as HTMLElement;
    expect(toast.className).toContain("bg-blue-50");
  });

  it("starts visible and fades out", () => {
    const { container } = render(<Toast message="Fading" onClose={vi.fn()} />);
    const toast = container.firstChild as HTMLElement;
    expect(toast.className).toContain("opacity-100");

    act(() => { vi.advanceTimersByTime(4000); });
    expect(toast.className).toContain("opacity-0");
  });
});
