import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────
const { mockAuth, mockFileTypeFromBuffer, mockSharpMeta, mockSharpRotate, mockSharpToBuffer, mockBucketOpenUploadStream, mockUploadOn, mockUploadEnd, mockRateLimit } = vi.hoisted(() => ({
  mockAuth: vi.fn().mockResolvedValue(null),
  mockFileTypeFromBuffer: vi.fn().mockResolvedValue({ mime: "image/png" }),
  mockSharpMeta: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
  mockSharpRotate: vi.fn(),
  mockSharpToBuffer: vi.fn().mockResolvedValue(Buffer.from("stripped")),
  mockBucketOpenUploadStream: vi.fn(),
  mockUploadOn: vi.fn(),
  mockUploadEnd: vi.fn(),
  mockRateLimit: vi.fn().mockResolvedValue(null),
}));

// Wire up sharp chain
const mockSharpInstance = { metadata: mockSharpMeta, rotate: mockSharpRotate, toBuffer: mockSharpToBuffer };
mockSharpRotate.mockReturnValue(mockSharpInstance);

// Wire up upload stream
const mockUploadStream = {
  id: { toString: () => "grid_fs_id_123" },
  on: mockUploadOn,
  end: mockUploadEnd,
};
mockUploadOn.mockImplementation((event: string, cb: () => void) => {
  if (event === "finish") setTimeout(cb, 0);
  return mockUploadStream;
});
mockBucketOpenUploadStream.mockReturnValue(mockUploadStream);

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mockRateLimit,
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/gridfs", () => ({
  getGridFSBucket: vi.fn().mockResolvedValue({
    openUploadStream: mockBucketOpenUploadStream,
  }),
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,
}));

vi.mock("file-type", () => ({
  fileTypeFromBuffer: mockFileTypeFromBuffer,
}));

vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue(mockSharpInstance),
}));

import { POST } from "@/app/api/images/route";

function buildFormRequest(fields: Record<string, string | File>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest(new URL("http://localhost:3000/api/images"), {
    method: "POST",
    body: formData,
  });
}

function makePngFile(size = 100): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], "test.png", { type: "image/png" });
}

describe("Images API — POST /api/images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset defaults
    mockAuth.mockResolvedValue({ user: { id: "admin-1", type: "admin" } });
    mockFileTypeFromBuffer.mockResolvedValue({ mime: "image/png" });
    mockSharpMeta.mockResolvedValue({ width: 100, height: 100 });
    mockSharpRotate.mockReturnValue(mockSharpInstance);
    mockSharpToBuffer.mockResolvedValue(Buffer.from("stripped"));

    // Reset upload stream event handler
    mockUploadOn.mockImplementation((event: string, cb: () => void) => {
      if (event === "finish") setTimeout(cb, 0);
      return mockUploadStream;
    });
    mockBucketOpenUploadStream.mockReturnValue(mockUploadStream);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const req = buildFormRequest({ file: makePngFile() });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user", async () => {
    mockAuth.mockResolvedValueOnce({});

    const req = buildFormRequest({ file: makePngFile() });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file provided", async () => {
    const formData = new FormData();
    const req = new NextRequest(new URL("http://localhost:3000/api/images"), {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("No file provided");
  });

  it("returns 422 for disallowed MIME type", async () => {
    const file = new File([new Uint8Array(100)], "test.pdf", { type: "application/pdf" });
    const req = buildFormRequest({ file });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("Invalid file type");
  });

  it("returns 422 when file is too large", async () => {
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" });
    const req = buildFormRequest({ file: bigFile });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("too large");
  });

  it("returns 403 when customer tries non-profile context", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "cust-1", type: "customer" } });

    const req = buildFormRequest({ file: makePngFile(), context: "channel_banner" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("allows customer to upload customer_profile context", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "cust-1", type: "customer" } });

    const req = buildFormRequest({ file: makePngFile(), context: "customer_profile" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.image_id).toBe("grid_fs_id_123");
  });

  it("returns 422 when file magic bytes do not match allowed type", async () => {
    mockFileTypeFromBuffer.mockResolvedValueOnce({ mime: "application/octet-stream" });

    const req = buildFormRequest({ file: makePngFile() });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("does not match");
  });

  it("returns 422 when file-type detection returns null", async () => {
    mockFileTypeFromBuffer.mockResolvedValueOnce(null);

    const req = buildFormRequest({ file: makePngFile() });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("does not match");
  });

  it("returns 422 when image dimensions exceed 8192", async () => {
    mockSharpMeta.mockResolvedValueOnce({ width: 9000, height: 100 });

    const req = buildFormRequest({ file: makePngFile() });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("9000x100");
    expect(body.error).toContain("max 8192x8192");
  });

  it("returns 422 when sharp cannot read dimensions", async () => {
    mockSharpMeta.mockRejectedValueOnce(new Error("corrupt image"));

    const req = buildFormRequest({ file: makePngFile() });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe("Unable to read image dimensions");
  });

  it("uploads image and returns image_id on success", async () => {
    const req = buildFormRequest({ file: makePngFile() });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.image_id).toBe("grid_fs_id_123");
  });

  it("defaults context to general when not specified", async () => {
    const req = buildFormRequest({ file: makePngFile() });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockBucketOpenUploadStream).toHaveBeenCalled();
  });

  it("returns rate limit response when rate limited", async () => {
    mockRateLimit.mockResolvedValueOnce(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );

    const req = buildFormRequest({ file: makePngFile() });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });
});
