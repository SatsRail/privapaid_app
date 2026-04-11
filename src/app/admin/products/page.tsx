import { t } from "@/i18n";
import { getInstanceConfig } from "@/config/instance";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { locale, currency } = await getInstanceConfig();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t(locale, "admin.products.title")}</h1>
        <p className="text-sm text-[var(--theme-text-secondary)]">
          {t(locale, "admin.products.description")}
        </p>
      </div>

      <ProductsClient currency={currency} />
    </div>
  );
}
