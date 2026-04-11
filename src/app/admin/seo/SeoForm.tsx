"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useLocale } from "@/i18n/useLocale";

interface SeoValues {
  google_analytics_id: string;
  google_site_verification: string;
}

interface SeoFormProps {
  initialValues: SeoValues;
}

export default function SeoForm({ initialValues }: SeoFormProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [form, setForm] = useState<SeoValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function update<K extends keyof SeoValues>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || t("admin.seo.save_failed") });
        return;
      }

      setMessage({ type: "success", text: t("admin.seo.saved") });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: t("admin.seo.save_failed") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t("admin.seo.title")}</h1>
        <p className="mt-1 text-sm text-[var(--theme-text-secondary)]">
          {t("admin.seo.description")}
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] p-5">
        <Input
          label="Google Analytics ID"
          type="text"
          value={form.google_analytics_id}
          onChange={(e) => update("google_analytics_id", e.target.value)}
          placeholder="G-XXXXXXXXXX"
        />
        <Input
          label="Google Site Verification"
          type="text"
          value={form.google_site_verification}
          onChange={(e) => update("google_site_verification", e.target.value)}
          placeholder="Verification meta tag content"
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="button" onClick={handleSave} loading={saving}>
          {t("admin.settings.save")}
        </Button>
      </div>

      {message && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-400"
              : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}
