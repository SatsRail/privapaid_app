import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────
const { mockBucketFind, mockBucketOpenDownloadStream } = vi.hoisted(() => ({
  mockBucketFind: vi.fn(),
  mockBucketOpenDownloadStream: vi.fn(),
}));

vi.mock("@/lib/gridfs", () => ({
  getGridFSBucket: vi.fn().mockResolvedValue({
    find: mockBucketFind,
    openDownloadStream: mockBucketOpenDownloadStream,
  }),
}));

import { GET } from "@/app/api/images/[id]/route";

function buildRequest(id: string): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(new URL(`http://localhost:3000/api/images/${id}`), {
    method: "GET",
  });
  return [req, { params: Promise.resolve({ id }) }];
}

// Helper to create an async iterable from chunks
function createAsyncIterable(chunks: Buffer[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}

describe("GET /api/images/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid ObjectId", async () => {
    const [req, context] = buildRequest("not-a-valid-id");
    const res = await GET(req, context);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid image ID");
  });

  it("returns 404 when image not found in GridFS", async () => {
    mockBucketFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });

    const [req, context] = buildRequest("507f1f77bcf86cd799439011");
    const res = await GET(req, context);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Image not found");
  });

  it("returns image buffer with correct content type", async () => {
    const imageData = Buffer.from("fake-image-data");
    mockBucketFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { _id: "507f1f77bcf86cd799439011", metadata: { contentType: "image/png" } },
      ]),
    });
    mockBucketOpenDownloadStream.mockReturnValue(createAsyncIterable([imageData]));

    const [req, context] = buildRequest("507f1f77bcf86cd799439011");
    const res = await GET(req, context);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Length")).toBe(String(imageData.length));
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("ETag")).toBe('"507f1f77bcf86cd799439011"');

    const responseBuffer = Buffer.from(await res.arrayBuffer());
    expect(responseBuffer).toEqual(imageData);
  });

  it("falls back to application/octet-stream when no contentType metadata", async () => {
    const imageData = Buffer.from("binary-data");
    mockBucketFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { _id: "507f1f77bcf86cd799439011", metadata: {} },
      ]),
    });
    mockBucketOpenDownloadStream.mockReturnValue(createAsyncIterable([imageData]));

    const [req, context] = buildRequest("507f1f77bcf86cd799439011");
    const res = await GET(req, context);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
  });

  it("handles multiple chunks from download stream", async () => {
    const chunk1 = Buffer.from("chunk1");
    const chunk2 = Buffer.from("chunk2");
    mockBucketFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { _id: "507f1f77bcf86cd799439011", metadata: { contentType: "image/jpeg" } },
      ]),
    });
    mockBucketOpenDownloadStream.mockReturnValue(createAsyncIterable([chunk1, chunk2]));

    const [req, context] = buildRequest("507f1f77bcf86cd799439011");
    const res = await GET(req, context);
    const responseBuffer = Buffer.from(await res.arrayBuffer());

    expect(res.status).toBe(200);
    expect(responseBuffer).toEqual(Buffer.concat([chunk1, chunk2]));
    expect(res.headers.get("Content-Length")).toBe(String(chunk1.length + chunk2.length));
  });

  it("returns 500 when GridFS throws", async () => {
    mockBucketFind.mockReturnValue({
      toArray: vi.fn().mockRejectedValue(new Error("GridFS error")),
    });

    const [req, context] = buildRequest("507f1f77bcf86cd799439011");
    const res = await GET(req, context);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to serve image");
  });

  it("returns 500 when download stream throws", async () => {
    mockBucketFind.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { _id: "507f1f77bcf86cd799439011", metadata: { contentType: "image/png" } },
      ]),
    });

    const errorIterable = {
      async *[Symbol.asyncIterator]() {
        throw new Error("Stream read error");
      },
    };
    mockBucketOpenDownloadStream.mockReturnValue(errorIterable);

    const [req, context] = buildRequest("507f1f77bcf86cd799439011");
    const res = await GET(req, context);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to serve image");
  });
});
