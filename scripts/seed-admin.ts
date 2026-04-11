/**
 * Seed script to create the initial owner.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts admin@example.com "Admin Name" password123
 *
 * Or via env vars:
 *   ADMIN_EMAIL=admin@example.com ADMIN_NAME="Admin" ADMIN_PASSWORD=password123 npx tsx scripts/seed-admin.ts
 *
 * Requires MONGODB_URI in .env.local or environment.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set. Check .env.local");
  process.exit(1);
}

const email = process.argv[2] || process.env.ADMIN_EMAIL;
const name = process.argv[3] || process.env.ADMIN_NAME || "Superadmin";
const password = process.argv[4] || process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error(
    "Usage: npx tsx scripts/seed-admin.ts <email> <name> <password>"
  );
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;
  const collection = db.collection("admins");

  const existing = await collection.findOne({ email });
  if (existing) {
    console.log(`Admin with email ${email} already exists. Skipping.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password!, 12);

  await collection.insertOne({
    email,
    password_hash: passwordHash,
    name,
    role: "owner",
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  });

  console.log(`Superadmin created: ${email}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
