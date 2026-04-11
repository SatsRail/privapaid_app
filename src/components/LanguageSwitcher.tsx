"use client";

import { useLocale } from "@/i18n/useLocale";
import type { Locale } from "@/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => setLocale("en" as Locale)}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === "en"
            ? "font-semibold"
            : "opacity-50 hover:opacity-80"
        }`}
        style={{ color: "var(--theme-text-secondary)" }}
      >
        EN
      </button>
      <span style={{ color: "var(--theme-text-secondary)" }} className="opacity-30">|</span>
      <button
        onClick={() => setLocale("es" as Locale)}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === "es"
            ? "font-semibold"
            : "opacity-50 hover:opacity-80"
        }`}
        style={{ color: "var(--theme-text-secondary)" }}
      >
        ES
      </button>
    </div>
  );
}
