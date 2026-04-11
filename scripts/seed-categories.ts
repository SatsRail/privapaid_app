/**
 * Seed script to create PrivaPaid categories.
 *
 * Usage:
 *   npx tsx scripts/seed-categories.ts
 *
 * Idempotent: skips categories whose slug already exists.
 * Requires MONGODB_URI in .env.local or environment.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set. Check .env.local");
  process.exit(1);
}

// No default categories — merchants create their own from scratch.
// This script is kept as a reference for how to seed categories if needed.
const CATEGORIES: string[] = [];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;
  const collection = db.collection("categories");

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < CATEGORIES.length; i++) {
    const name = CATEGORIES[i];
    const slug = toSlug(name);

    const existing = await collection.findOne({ slug });
    if (existing) {
      console.log(`  skip: "${name}" (slug "${slug}" already exists)`);
      skipped++;
      continue;
    }

    await collection.insertOne({
      name,
      slug,
      position: i,
      active: true,
      created_at: new Date(),
    });
    console.log(`  added: "${name}" → ${slug}`);
    inserted++;
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
