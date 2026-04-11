 

const mockGetGridFSBucket = vi.hoisted(() => vi.fn());

vi.mock("@/lib/gridfs", () => ({
  getGridFSBucket: mockGetGridFSBucket,
}));

vi.mock("mongodb", () => ({
  ObjectId: class MockObjectId {
    id: string;
    constructor(id: string) {
      this.id = id;
    }
  },
}));

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLogoBuffer } from "@/lib/logo";

describe("getLogoBuffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when neither logo_image_id nor logo_url is set", async () => {
    const result = await getLogoBuffer({});
    expect(result).toBeNull();
  });

  it("fetches logo from GridFS when logo_image_id is set", async () => {
    const fileData = Buffer.from("fake-image-data");
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield fileData;
      },
    };

    const mockBucket = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ _id: "img_123" }]),
      }),
      openDownloadStream: vi.fn().mockReturnValue(mockStream),
    };
    mockGetGridFSBucket.mockResolvedValue(mockBucket);

    const result = await getLogoBuffer({ logo_image_id: "img_123" });

    expect(mockGetGridFSBucket).toHaveBeenCalled();
    expect(mockBucket.find).toHaveBeenCalledWith({
      _id: expect.objectContaining({ id: "img_123" }),
    });
    expect(result).toEqual(fileData);
  });

  it("returns null when GridFS file is not found", async () => {
    const mockBucket = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    };
    mockGetGridFSBucket.mockResolvedValue(mockBucket);

    const result = await getLogoBuffer({ logo_image_id: "nonexistent" });

    expect(result).toBeNull();
  });

  it("handles non-Buffer chunks from GridFS stream", async () => {
    const rawData = new Uint8Array([1, 2, 3, 4]);
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield rawData;
      },
    };

    const mockBucket = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ _id: "img_456" }]),
      }),
      openDownloadStream: vi.fn().mockReturnValue(mockStream),
    };
    mockGetGridFSBucket.mockResolvedValue(mockBucket);

    const result = await getLogoBuffer({ logo_image_id: "img_456" });

    expect(result).toBeInstanceOf(Buffer);
    expect(result).toEqual(Buffer.from(rawData));
  });

  it("fetches logo from external URL when logo_url is set", async () => {
    const imageBytes = new Uint8Array([10, 20, 30]);
    const mockResponse = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(imageBytes.buffer),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await getLogoBuffer({
      logo_url: "https://example.com/logo.png",
    });

    expect(global.fetch).toHaveBeenCalledWith("https://example.com/logo.png");
    expect(result).toBeInstanceOf(Buffer);
    expect(result).toEqual(Buffer.from(imageBytes.buffer));
  });

  it("returns null when external URL fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const result = await getLogoBuffer({
      logo_url: "https://example.com/missing.png",
    });

    expect(result).toBeNull();
  });

  it("prefers logo_image_id over logo_url when both are set", async () => {
    const fileData = Buffer.from("gridfs-image");
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield fileData;
      },
    };

    const mockBucket = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ _id: "img_789" }]),
      }),
      openDownloadStream: vi.fn().mockReturnValue(mockStream),
    };
    mockGetGridFSBucket.mockResolvedValue(mockBucket);
    global.fetch = vi.fn();

    const result = await getLogoBuffer({
      logo_image_id: "img_789",
      logo_url: "https://example.com/logo.png",
    });

    expect(result).toEqual(fileData);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("concatenates multiple chunks from GridFS stream", async () => {
    const chunk1 = Buffer.from("hello");
    const chunk2 = Buffer.from("world");
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield chunk1;
        yield chunk2;
      },
    };

    const mockBucket = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ _id: "img_multi" }]),
      }),
      openDownloadStream: vi.fn().mockReturnValue(mockStream),
    };
    mockGetGridFSBucket.mockResolvedValue(mockBucket);

    const result = await getLogoBuffer({ logo_image_id: "img_multi" });

    expect(result).toEqual(Buffer.concat([chunk1, chunk2]));
  });
});
