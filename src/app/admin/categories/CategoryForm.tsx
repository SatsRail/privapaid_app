"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useLocale } from "@/i18n/useLocale";

interface CategoryFormProps {
  initialData?: {
    _id: string;
    name: string;
    slug: string;
    position: number;
    active: boolean;
  };
}

export default function CategoryForm({ initialData }: CategoryFormProps) {
  const router = useRouter();
  const { t } = useLocale();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [position, setPosition] = useState(initialData?.position ?? 0);
  const [active, setActive] = useState(initialData?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = { name, slug, position, active };
    const url = isEditing
      ? `/api/admin/categories/${initialData._id}`
      : "/api/admin/categories";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || t("admin.categories.save_failed"));
        return;
      }
      router.push("/admin/categories");
      router.refresh();
    } catch {
      setError(t("admin.categories.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <Input
        label={t("admin.categories.name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        label={t("admin.categories.slug")}
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        helperText={t("admin.categories.slug_hint")}
      />
      <Input
        label={t("admin.categories.position")}
        type="number"
        value={position}
        onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="rounded border-[var(--theme-border)]"
        />
        {t("admin.categories.active")}
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          {isEditing ? t("admin.categories.update") : t("admin.categories.create")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          {t("admin.categories.cancel")}
        </Button>
      </div>
    </form>
  );
}
