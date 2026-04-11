// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import * as Sentry from "@sentry/nextjs";

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test error");
  return <p>Child content</p>;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Suppress React error boundary console output
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <p>Hello</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders default error UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong loading this section.")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong loading this section.")).toBeNull();
  });

  it("reports error to Sentry", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { context: "ErrorBoundary" },
      })
    );
  });

  it("shows retry button with remaining count", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Try again (3 left)")).toBeInTheDocument();
  });

  it("decrements retry count on retry", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText("Try again (3 left)"));
    // Component re-throws, so error UI shows again with decremented count
    expect(screen.getByText("Try again (2 left)")).toBeInTheDocument();
  });

  it("shows exhausted message after max retries", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText("Try again (3 left)"));
    fireEvent.click(screen.getByText("Try again (2 left)"));
    fireEvent.click(screen.getByText("Try again (1 left)"));

    expect(screen.getByText(/failed to load after 3 attempts/)).toBeInTheDocument();
    expect(screen.queryByText(/Try again/)).toBeNull();
  });
});
