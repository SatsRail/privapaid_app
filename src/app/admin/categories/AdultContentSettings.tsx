"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useLocale } from "@/i18n/useLocale";

interface AdultContentSettingsProps {
  initialNsfw: boolean;
  initialDisclaimer: string;
}

export default function AdultContentSettings({
  initialNsfw,
  initialDisclaimer,
}: AdultContentSettingsProps) {
  const { t } = useLocale();
  const [nsfwEnabled, setNsfwEnabled] = useState(initialNsfw);
  const [disclaimer, setDisclaimer] = useState(initialDisclaimer);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nsfw_enabled: nsfwEnabled,
          adult_disclaimer: disclaimer,
        }),
      });

      if (!res.ok) {
        setMessage({
          type: "error",
          text: t("admin.categories.adult_save_failed"),
        });
        return;
      }

      setMessage({
        type: "success",
        text: t("admin.categories.adult_saved"),
      });
    } catch {
      setMessage({
        type: "error",
        text: t("admin.categories.adult_save_failed"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-[var(--theme-text)]">
        {t("admin.categories.adult_content")}
      </h2>
      <div className="space-y-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] p-5">
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={nsfwEnabled}
              onChange={(e) => {
                setNsfwEnabled(e.target.checked);
                setMessage(null);
              }}
              className="h-4 w-4 rounded border-[var(--theme-border)] bg-[var(--theme-bg-secondary)]"
            />
            <div>
              <span className="text-sm font-medium text-[var(--theme-text)]">
                {t("admin.categories.adult_toggle")}
              </span>
              <p className="text-xs text-[var(--theme-text-secondary)]">
                {t("admin.categories.adult_toggle_hint")}
              </p>
            </div>
          </label>
        </div>

        {nsfwEnabled && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--theme-text)]">
              {t("admin.categories.adult_disclaimer")}
            </label>
            <textarea
              value={disclaimer}
              onChange={(e) => {
                setDisclaimer(e.target.value);
                setMessage(null);
              }}
              placeholder={t(
                "admin.categories.adult_disclaimer_placeholder"
              )}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-text-secondary)]"
            />
            <p className="mt-1 text-xs text-[var(--theme-text-secondary)]">
              {t("admin.categories.adult_disclaimer_hint")}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="button" onClick={handleSave} loading={saving}>
            {t("admin.settings.save")}
          </Button>
          {message && (
            <span
              className={`text-sm ${
                message.type === "success"
                  ? "text-green-400"
                  : "text-red-500"
              }`}
            >
              {message.text}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
