import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";
import Settings from "@/models/Settings";
import { t } from "@/i18n";
import { getInstanceConfig } from "@/config/instance";
import AdultContentSettings from "./AdultContentSettings";
import CategoryList from "./CategoryList";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await connectDB();
  const categories = await Category.find().sort({ position: 1 }).lean();
  const settings = await Settings.findOne({ setup_completed: true })
    .select("nsfw_enabled adult_disclaimer")
    .lean();
  const { locale } = await getInstanceConfig();

  const serializedCategories = categories.map((cat) => ({
    _id: String(cat._id),
    name: cat.name,
    slug: cat.slug,
    position: cat.position,
    active: cat.active,
  }));

  return (
    <div>
      <AdultContentSettings
        initialNsfw={settings?.nsfw_enabled ?? false}
        initialDisclaimer={settings?.adult_disclaimer ?? ""}
      />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t(locale, "admin.categories.title")}</h1>
        <Link
          href="/admin/categories/new"
          className="rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t(locale, "admin.categories.new")}
        </Link>
      </div>

      <CategoryList initialCategories={serializedCategories} />
    </div>
  );
}
