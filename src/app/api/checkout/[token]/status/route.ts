import { NextResponse } from "next/server";
import { satsrail } from "@/lib/satsrail";
import * as Sentry from "@sentry/nextjs";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  try {
    const status = await satsrail.getCheckoutStatus(token);
    return NextResponse.json(status);
  } catch (err) {
    Sentry.captureException(err, { tags: { context: "checkout_status_proxy" } });
    return NextResponse.json(
      { error: "Failed to fetch checkout status" },
      { status: 502 }
    );
  }
}
