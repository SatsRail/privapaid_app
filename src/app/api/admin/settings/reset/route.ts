import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireOwnerApi } from "@/lib/auth-helpers";
import { clearConfigCache } from "@/config/instance";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const CONFIRM_PHRASE = "RESET";

export async function POST(request: Request) {
  const authResult = await requireOwnerApi();
  if (authResult instanceof NextResponse) return authResult;

  let body: { confirm?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (body.confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `You must send { "confirm": "${CONFIRM_PHRASE}" } to proceed` },
      { status: 400 }
    );
  }

  try {
    const conn = await connectDB();
    const db = conn.connection.db ?? mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not ready" },
        { status: 500 }
      );
    }

    // Audit BEFORE wiping — this log entry will be deleted too,
    // but it captures intent in case the audit collection is backed up
    audit({
      actorId: authResult.id,
      actorEmail: authResult.email,
      actorType: "admin",
      action: "settings.factory_reset",
      targetType: "settings",
      details: { warning: "Full data wipe initiated" },
    });

    // Drop all application collections
    const collections = await db.listCollections().toArray();
    const dropped: string[] = [];

    for (const col of collections) {
      try {
        await db.dropCollection(col.name);
        dropped.push(col.name);
      } catch (err) {
        console.error(`Failed to drop collection ${col.name}:`, err);
      }
    }

    // Clear cached config so the app returns to setup mode
    clearConfigCache();

    return NextResponse.json({
      reset: true,
      collections_dropped: dropped,
    });
  } catch (error) {
    console.error("Factory reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset application" },
      { status: 500 }
    );
  }
}
