import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, string> = { status: "ok" };

  // Check MongoDB
  try {
    const mongoose = await connectDB();
    const state = mongoose.connection.readyState;
    result.mongo = state === 1 ? "connected" : `state_${state}`;
  } catch {
    result.status = "degraded";
    result.mongo = "disconnected";
  }

  // Check SatsRail API reachability
  const satsrailUrl = process.env.SATSRAIL_API_URL;
  if (satsrailUrl) {
    try {
      const res = await fetch(`${satsrailUrl}/pub/exchanges`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      result.satsrail = res.ok ? "reachable" : `http_${res.status}`;
    } catch {
      result.status = "degraded";
      result.satsrail = "unreachable";
    }
  } else {
    result.satsrail = "not_configured";
  }

  const statusCode = result.status === "ok" ? 200 : 503;
  return NextResponse.json(result, { status: statusCode });
}
