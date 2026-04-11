import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import { connectDB } from "@/lib/mongodb";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

let bucket: GridFSBucket | null = null;

export async function getGridFSBucket(): Promise<GridFSBucket> {
  if (bucket) return bucket;

  const conn = await connectDB();
  const db = conn.connection.db ?? mongoose.connection.db;
  if (!db) {
    // Ensure the connection is fully established
    await mongoose.connection.asPromise();
    const readyDb = mongoose.connection.db;
    if (!readyDb) throw new Error("MongoDB connection not ready");
    bucket = new GridFSBucket(readyDb, { bucketName: "images" });
    return bucket;
  }

  bucket = new GridFSBucket(db, { bucketName: "images" });
  return bucket;
}
