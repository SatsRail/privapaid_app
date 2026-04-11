import { NextResponse } from "next/server";
import { satsrail } from "@/lib/satsrail";
import * as Sentry from "@sentry/nextjs";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  try {
    const svg = await satsrail.getCheckoutQr(token);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { context: "checkout_qr_proxy" } });
    return NextResponse.json(
      { error: "Failed to fetch checkout QR" },
      { status: 502 }
    );
  }
}
