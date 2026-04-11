import { connectDB } from "@/lib/mongodb";
import { requireOwner } from "@/lib/auth-helpers";
import Settings from "@/models/Settings";
import AppearanceForm from "./AppearanceForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireOwner();
  await connectDB();

  const settings = await Settings.findOne({ setup_completed: true })
    .select(
      "instance_name logo_url logo_image_id about_text nsfw_enabled theme_primary theme_bg theme_bg_secondary theme_text theme_text_secondary theme_heading theme_border theme_font google_analytics_id google_site_verification sentry_dsn"
    )
    .lean();

  if (!settings) {
    return (
      <div className="py-16 text-center text-[var(--theme-text-secondary)]">
        <p>Settings not found. Complete setup first.</p>
      </div>
    );
  }

  // Serialize for client component
  const initialValues = {
    instance_name: settings.instance_name || "",
    logo_url: settings.logo_url || "",
    logo_image_id: settings.logo_image_id || "",
    about_text: settings.about_text || "",
    theme_primary: settings.theme_primary || "#3b82f6",
    theme_bg: settings.theme_bg || "#0a0a0a",
    theme_bg_secondary: settings.theme_bg_secondary || "#18181b",
    theme_text: settings.theme_text || "#ededed",
    theme_text_secondary: settings.theme_text_secondary || "#a1a1aa",
    theme_heading: settings.theme_heading || "#fafafa",
    theme_border: settings.theme_border || "#27272a",
    theme_font: settings.theme_font || "Geist",
    google_analytics_id: settings.google_analytics_id || "",
    google_site_verification: settings.google_site_verification || "",
    sentry_dsn: settings.sentry_dsn || "",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Appearance</h1>
        <p className="mt-1 text-sm text-[var(--theme-text-secondary)]">
          Customize the look and feel of your site
        </p>
      </div>
      <AppearanceForm initialValues={initialValues} />
    </div>
  );
}
