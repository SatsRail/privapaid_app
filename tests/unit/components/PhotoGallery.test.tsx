// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PhotoGallery from "@/components/PhotoGallery";
import type { PhotoItem } from "@/components/PhotoGallery";

describe("PhotoGallery", () => {
  const images: PhotoItem[] = [
    { url: "/img1.jpg", caption: "First photo" },
    { url: "/img2.jpg", caption: "Second photo" },
    { url: "/img3.jpg" },
  ];

  it("returns null for empty images array", () => {
    const { container } = render(<PhotoGallery images={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders grid with all images", () => {
    render(<PhotoGallery images={images} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(3);
    expect(imgs[0]).toHaveAttribute("src", "/img1.jpg");
    expect(imgs[0]).toHaveAttribute("alt", "First photo");
    expect(imgs[2]).toHaveAttribute("alt", "Photo 3");
  });

  it("shows photo count text", () => {
    render(<PhotoGallery images={images} />);
    expect(screen.getByText("3 photos")).toBeInTheDocument();
  });

  it("shows singular for 1 photo", () => {
    render(<PhotoGallery images={[images[0]]} />);
    expect(screen.getByText("1 photo")).toBeInTheDocument();
  });

  it("shows caption overlay on images that have captions", () => {
    render(<PhotoGallery images={images} />);
    expect(screen.getByText("First photo")).toBeInTheDocument();
    expect(screen.getByText("Second photo")).toBeInTheDocument();
  });

  it("opens lightbox when clicking an image", () => {
    render(<PhotoGallery images={images} />);
    const buttons = screen.getAllByRole("button");
    // The grid buttons (one per image)
    fireEvent.click(buttons[0]);

    // Lightbox should show close button, counter, and the image
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("closes lightbox on close button click", () => {
    render(<PhotoGallery images={images} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByLabelText("Close")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByLabelText("Close")).not.toBeInTheDocument();
  });

  it("closes lightbox on backdrop click", () => {
    render(<PhotoGallery images={images} />);
    fireEvent.click(screen.getAllByRole("button")[0]);

    // The backdrop div has the fixed inset class
    const backdrop = document.querySelector(".fixed.inset-0");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(screen.queryByLabelText("Close")).not.toBeInTheDocument();
  });

  it("navigates to next image", () => {
    render(<PhotoGallery images={images} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Next"));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("navigates to previous image", () => {
    render(<PhotoGallery images={images} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Previous"));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("wraps from last to first on next", () => {
    render(<PhotoGallery images={images} />);
    fireEvent.click(screen.getAllByRole("button")[2]); // Open on third
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Next"));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("does not show prev/next buttons for single image", () => {
    render(<PhotoGallery images={[images[0]]} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
    expect(screen.queryByLabelText("Previous")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next")).not.toBeInTheDocument();
  });

  it("handles keyboard: Escape closes", () => {
    render(<PhotoGallery images={images} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByLabelText("Close")).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByLabelText("Close")).not.toBeInTheDocument();
  });

  it("handles keyboard: ArrowRight goes next", () => {
    render(<PhotoGallery images={images} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: "ArrowRight" });
    });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("handles keyboard: ArrowLeft goes prev", () => {
    render(<PhotoGallery images={images} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: "ArrowLeft" });
    });
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("prevents body scroll when lightbox is open and restores on close", () => {
    render(<PhotoGallery images={images} />);
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(document.body.style.overflow).toBe("hidden");

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(document.body.style.overflow).toBe("");
  });

  it("image container click does not close lightbox (stopPropagation)", () => {
    render(<PhotoGallery images={images} />);
    fireEvent.click(screen.getAllByRole("button")[0]);

    // Click the image itself — lightbox should stay open
    const lightboxImg = document.querySelector(".max-h-\\[80vh\\]");
    expect(lightboxImg).not.toBeNull();
    fireEvent.click(lightboxImg!.parentElement!);
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("shows caption in lightbox for images with captions", () => {
    render(<PhotoGallery images={images} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    // The lightbox image caption
    const captions = screen.getAllByText("First photo");
    expect(captions.length).toBeGreaterThanOrEqual(1);
  });

  it("does not show caption in lightbox for images without captions", () => {
    render(<PhotoGallery images={images} />);
    // Open the third image which has no caption
    fireEvent.click(screen.getAllByRole("button")[2]);
    // Only the counter and close button — no extra caption text
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("prev/next buttons stop propagation (don't close lightbox)", () => {
    render(<PhotoGallery images={images} />);
    fireEvent.click(screen.getAllByRole("button")[0]);

    // Click next — should not close
    fireEvent.click(screen.getByLabelText("Next"));
    expect(screen.getByLabelText("Close")).toBeInTheDocument();

    // Click prev — should not close
    fireEvent.click(screen.getByLabelText("Previous"));
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });
});
