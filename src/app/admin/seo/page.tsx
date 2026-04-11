import { connectDB } from "@/lib/mongodb";
import { requireOwner } from "@/lib/auth-helpers";
import Settings from "@/models/Settings";
import SeoForm from "./SeoForm";

export const dynamic = "force-dynamic";

export default async function SeoPage() {
  await requireOwner();
  await connectDB();

  const settings = await Settings.findOne({ setup_completed: true })
    .select("google_analytics_id google_site_verification")
    .lean();

  if (!settings) {
    return (
      <div className="py-16 text-center text-[var(--theme-text-secondary)]">
        <p>Settings not found. Complete setup first.</p>
      </div>
    );
  }

  const initialValues = {
    google_analytics_id: settings.google_analytics_id || "",
    google_site_verification: settings.google_site_verification || "",
  };

  return (
    <div>
      <SeoForm initialValues={initialValues} />
    </div>
  );
}
