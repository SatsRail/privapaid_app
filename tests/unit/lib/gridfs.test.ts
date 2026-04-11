/* eslint-disable @typescript-eslint/no-explicit-any */

const mockConnectDB = vi.hoisted(() => vi.fn());
const mockAsPromise = vi.hoisted(() => vi.fn());
const mockGridFSBucketInstance = vi.hoisted(() => ({
  bucketName: "images",
}));
const gridFSConstructorSpy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/mongodb", () => ({
  connectDB: mockConnectDB,
}));

vi.mock("mongodb", () => ({
  GridFSBucket: class MockGridFSBucket {
    constructor(...args: any[]) {
      gridFSConstructorSpy(...args);
      Object.assign(this, mockGridFSBucketInstance);
    }
  },
}));

vi.mock("mongoose", () => {
  const connection = {
    db: null as any,
    asPromise: mockAsPromise,
  };
  return {
    default: {
      connection,
    },
    __esModule: true,
  };
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/gridfs";

describe("gridfs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("constants", () => {
    it("ALLOWED_IMAGE_TYPES contains expected MIME types", () => {
      expect(ALLOWED_IMAGE_TYPES).toContain("image/jpeg");
      expect(ALLOWED_IMAGE_TYPES).toContain("image/png");
      expect(ALLOWED_IMAGE_TYPES).toContain("image/webp");
      expect(ALLOWED_IMAGE_TYPES).toContain("image/gif");
      expect(ALLOWED_IMAGE_TYPES).toHaveLength(4);
    });

    it("MAX_IMAGE_SIZE is 5MB", () => {
      expect(MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024);
    });
  });

  describe("getGridFSBucket", () => {
    it("creates a GridFSBucket with the images bucket name using conn.connection.db", async () => {
      const fakeDb = { name: "testdb" };
      mockConnectDB.mockResolvedValue({ connection: { db: fakeDb } });

      const { getGridFSBucket } = await import("@/lib/gridfs");
      const bucket = await getGridFSBucket();

      expect(mockConnectDB).toHaveBeenCalled();
      expect(gridFSConstructorSpy).toHaveBeenCalledWith(fakeDb, {
        bucketName: "images",
      });
      expect(bucket).toHaveProperty("bucketName", "images");
    });

    it("returns cached bucket on second call", async () => {
      const fakeDb = { name: "testdb" };
      mockConnectDB.mockResolvedValue({ connection: { db: fakeDb } });

      const { getGridFSBucket } = await import("@/lib/gridfs");

      const first = await getGridFSBucket();
      const second = await getGridFSBucket();

      expect(first).toBe(second);
      expect(mockConnectDB).toHaveBeenCalledTimes(1);
    });

    it("falls back to mongoose.connection.db when conn.connection.db is null", async () => {
      const fallbackDb = { name: "fallbackdb" };
      // conn.connection.db is null, AND mongoose.connection.db is null initially
      // so it enters the !db fallback branch
      mockConnectDB.mockResolvedValue({ connection: { db: null } });

      // After asPromise resolves, mongoose.connection.db should be set
      const mongoose = (await import("mongoose")).default;
      mockAsPromise.mockImplementation(async () => {
        (mongoose.connection as any).db = fallbackDb;
      });

      const { getGridFSBucket } = await import("@/lib/gridfs");
      const bucket = await getGridFSBucket();

      expect(mockAsPromise).toHaveBeenCalled();
      expect(gridFSConstructorSpy).toHaveBeenCalledWith(fallbackDb, {
        bucketName: "images",
      });
      expect(bucket).toHaveProperty("bucketName", "images");
    });

    it("throws when MongoDB connection is not ready", async () => {
      mockConnectDB.mockResolvedValue({ connection: { db: null } });
      mockAsPromise.mockResolvedValue(undefined);

      const mongoose = (await import("mongoose")).default;
      (mongoose.connection as any).db = null;

      const { getGridFSBucket } = await import("@/lib/gridfs");

      await expect(getGridFSBucket()).rejects.toThrow(
        "MongoDB connection not ready"
      );
    });
  });
});
