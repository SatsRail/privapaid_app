import Badge from "@/components/ui/Badge";
import { t } from "@/i18n";
import type { SerializedProduct } from "@/app/c/[slug]/[mediaId]/types";

interface MediaHeaderProps {
  name: string;
  mediaType: string;
  products: SerializedProduct[];
  viewsCount: number;
  commentsCount: number;
  locale: string;
}

export default function MediaHeader({
  name,
  mediaType,
  products,
  viewsCount,
  commentsCount,
  locale,
}: MediaHeaderProps) {
  const pricePill = (() => {
    if (products.length === 0) return null;
    const prices = products
      .filter((p) => p.priceCents != null)
      .map((p) => ({ cents: p.priceCents!, currency: p.currency || "USD" }));
    if (prices.length === 0) return null;
    const lowest = prices.reduce((a, b) => (a.cents <= b.cents ? a : b));
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: lowest.currency,
      minimumFractionDigits: lowest.cents % 100 === 0 ? 0 : 2,
    }).format(lowest.cents / 100);
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: "var(--theme-primary)", color: "var(--theme-bg, #000)" }}
      >
        {prices.length > 1 ? `${t(locale, "viewer.media.from")} ${formatted}` : formatted}
      </span>
    );
  })();

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold">{name}</h1>
      <div className="mt-2 flex items-center gap-2">
        <Badge>{mediaType}</Badge>
        {pricePill}
      </div>
      <div className="mt-1.5 flex gap-3 text-sm" style={{ color: "var(--theme-text-secondary)" }}>
        {viewsCount > 0 && (
          <span>{t(locale, "viewer.media.views", { count: viewsCount })}</span>
        )}
        {commentsCount > 0 && (
          <span>{t(locale, "viewer.media.comments", { count: commentsCount })}</span>
        )}
      </div>
    </div>
  );
}
