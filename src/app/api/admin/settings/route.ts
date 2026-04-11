import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { requireOwnerApi } from "@/lib/auth-helpers";
import { clearConfigCache } from "@/config/instance";
import Settings from "@/models/Settings";
import { audit } from "@/lib/audit";
import { validateBody, isValidationError, schemas } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireOwnerApi();
  if (authResult instanceof NextResponse) return authResult;

  await connectDB();
  const settings = await Settings.findOne({ setup_completed: true })
    .select(
      "instance_name logo_url logo_image_id about_text nsfw_enabled adult_disclaimer theme_primary theme_bg theme_bg_secondary theme_text theme_text_secondary theme_heading theme_border theme_font google_analytics_id google_site_verification sentry_dsn"
    )
    .lean();

  if (!settings) {
    return NextResponse.json({ error: "Settings not found" }, { status: 404 });
  }

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const authResult = await requireOwnerApi();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const validated = await validateBody(request, schemas.settingsUpdate);
    if (isValidationError(validated)) return validated;

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validated)) {
      if (value !== undefined) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    await connectDB();
    const settings = await Settings.findOneAndUpdate(
      { setup_completed: true },
      { $set: updates },
      { returnDocument: "after" }
    )
      .select(
        "instance_name logo_url logo_image_id about_text nsfw_enabled adult_disclaimer theme_primary theme_bg theme_bg_secondary theme_text theme_text_secondary theme_heading theme_border theme_font google_analytics_id google_site_verification sentry_dsn"
      )
      .lean();

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    // Audit log
    audit({
      actorId: authResult.id,
      actorEmail: authResult.email,
      actorType: "admin",
      action: "settings.update",
      targetType: "settings",
      details: { fields: Object.keys(updates) },
    });

    // Clear the cached config so changes take effect immediately
    clearConfigCache();

    // Revalidate all pages so theme changes apply everywhere
    revalidatePath("/", "layout");

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
