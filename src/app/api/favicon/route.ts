import { NextResponse } from "next/server";
import sharp from "sharp";
import { connectDB } from "@/lib/mongodb";
import { getLogoBuffer } from "@/lib/logo";
import Settings from "@/models/Settings";

export async function GET(_req: Request) {
  try {
    await connectDB();
    const settings = await Settings.findOne({ setup_completed: true }).lean();

    if (!settings?.logo_image_id && !settings?.logo_url) {
      return NextResponse.redirect(new URL("/favicon.ico", _req.url));
    }

    const logoBuffer = await getLogoBuffer(settings);
    if (!logoBuffer) {
      return NextResponse.redirect(new URL("/favicon.ico", _req.url));
    }

    const favicon = await sharp(logoBuffer)
      .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return new Response(new Uint8Array(favicon), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Favicon generation error:", error);
    return NextResponse.redirect(new URL("/favicon.ico", _req.url));
  }
}
