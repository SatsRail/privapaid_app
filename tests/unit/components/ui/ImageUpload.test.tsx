// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ImageUpload from "@/components/ui/ImageUpload";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("URL", {
    ...globalThis.URL,
    createObjectURL: vi.fn(() => "blob:preview-url"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ImageUpload", () => {
  const defaultProps = {
    context: "profile",
    onUpload: vi.fn(),
  };

  it("renders label", () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.getByText("Image")).toBeInTheDocument();
  });

  it("renders custom label", () => {
    render(<ImageUpload {...defaultProps} label="Banner" />);
    expect(screen.getByText("Banner")).toBeInTheDocument();
  });

  it("shows 'Upload Image' when no image exists", () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.getByText("Upload Image")).toBeInTheDocument();
  });

  it("shows 'Change Image' when currentImageId exists", () => {
    render(<ImageUpload {...defaultProps} currentImageId="abc123" />);
    expect(screen.getByText("Change Image")).toBeInTheDocument();
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/api/images/abc123");
  });

  it("shows 'Change Image' when currentImageUrl exists", () => {
    render(<ImageUpload {...defaultProps} currentImageUrl="/photos/test.jpg" />);
    expect(screen.getByText("Change Image")).toBeInTheDocument();
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/photos/test.jpg");
  });

  it("prioritizes currentImageId over currentImageUrl", () => {
    render(<ImageUpload {...defaultProps} currentImageId="id1" currentImageUrl="/url.jpg" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/api/images/id1");
  });

  it("shows format hint", () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.getByText("JPEG, PNG, WebP, or GIF (max 5MB)")).toBeInTheDocument();
  });

  it("triggers file input when button clicked", () => {
    render(<ImageUpload {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    fireEvent.click(screen.getByText("Upload Image"));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("uploads file successfully", async () => {
    const onUpload = vi.fn();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ image_id: "new-id" }),
    });

    render(<ImageUpload {...defaultProps} onUpload={onUpload} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith("new-id");
    });

    // Preview image should be shown
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  it("shows error on upload failure (non-ok response)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "File too large" }),
    });

    render(<ImageUpload {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText("File too large")).toBeInTheDocument();
    });
  });

  it("shows default error when response has no error message", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    render(<ImageUpload {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
  });

  it("shows error on network failure", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network"));

    render(<ImageUpload {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
  });

  it("does nothing when no file selected", async () => {
    render(<ImageUpload {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [] } });
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("disables button while uploading", async () => {
    let resolveUpload: (v: unknown) => void;
    (fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => { resolveUpload = resolve; })
    );

    render(<ImageUpload {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Button should show "Uploading..." text and be disabled
    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    const button = screen.getByText("Uploading...").closest("button");
    expect(button).toBeDisabled();

    // Resolve the upload
    await act(async () => {
      resolveUpload!({
        ok: true,
        json: async () => ({ image_id: "done" }),
      });
    });
  });

  it("clears preview on upload error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Bad" }),
    });

    render(<ImageUpload {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText("Bad")).toBeInTheDocument();
    });

    // After error, preview is cleared so button should say "Upload Image"
    expect(screen.getByText("Upload Image")).toBeInTheDocument();
  });

  it("accepts correct file types", () => {
    render(<ImageUpload {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput.getAttribute("accept")).toBe("image/jpeg,image/png,image/webp,image/gif");
  });
});
