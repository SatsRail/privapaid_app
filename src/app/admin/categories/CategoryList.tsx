"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { useLocale } from "@/i18n/useLocale";

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  position: number;
  active: boolean;
}

interface CategoryListProps {
  initialCategories: CategoryItem[];
}

export default function CategoryList({ initialCategories }: CategoryListProps) {
  const { t } = useLocale();
  const [categories, setCategories] = useState(initialCategories);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const dragNode = useRef<HTMLTableRowElement | null>(null);

  function handleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    dragNode.current = e.currentTarget as HTMLTableRowElement;
    e.dataTransfer.effectAllowed = "move";
    // Make the drag image slightly transparent
    requestAnimationFrame(() => {
      if (dragNode.current) {
        dragNode.current.style.opacity = "0.4";
      }
    });
  }

  function handleDragEnd() {
    if (dragNode.current) {
      dragNode.current.style.opacity = "1";
    }
    setDragIndex(null);
    setOverIndex(null);
    dragNode.current = null;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex === null || dragIndex === index) return;
    setOverIndex(index);
  }

  async function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) return;

    const updated = [...categories];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, moved);

    // Update positions
    const reordered = updated.map((cat, i) => ({ ...cat, position: i }));
    setCategories(reordered);
    setDragIndex(null);
    setOverIndex(null);

    // Persist to server
    setSaving(true);
    try {
      await fetch("/api/admin/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: reordered.map((cat) => ({
            id: cat._id,
            position: cat.position,
          })),
        }),
      });
    } catch {
      // Revert on failure
      setCategories(initialCategories);
    } finally {
      setSaving(false);
    }
  }

  if (categories.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--theme-border)]">
        <div className="px-4 py-8 text-center text-[var(--theme-text-secondary)]">
          {t("admin.categories.empty")}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--theme-border)]">
      {saving && (
        <div className="border-b border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] px-4 py-1.5 text-xs text-[var(--theme-text-secondary)]">
          Saving...
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="bg-[var(--theme-bg-secondary)]">
          <tr>
            <th className="w-10 px-3 py-3"></th>
            <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">
              {t("admin.categories.name")}
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">
              {t("admin.categories.slug")}
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">
              {t("admin.categories.status")}
            </th>
            <th className="px-4 py-3 text-right font-medium text-[var(--theme-text-secondary)]">
              {t("admin.categories.actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--theme-border)]">
          {categories.map((cat, index) => (
            <tr
              key={cat._id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`hover:bg-[var(--theme-bg-secondary)] transition-colors ${
                overIndex === index && dragIndex !== null
                  ? dragIndex < index
                    ? "border-b-2 !border-b-[var(--theme-primary)]"
                    : "border-t-2 !border-t-[var(--theme-primary)]"
                  : ""
              }`}
              style={{ cursor: "grab" }}
            >
              <td className="px-3 py-3 text-[var(--theme-text-secondary)]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  opacity="0.4"
                >
                  <circle cx="6" cy="4" r="1.5" />
                  <circle cx="10" cy="4" r="1.5" />
                  <circle cx="6" cy="8" r="1.5" />
                  <circle cx="10" cy="8" r="1.5" />
                  <circle cx="6" cy="12" r="1.5" />
                  <circle cx="10" cy="12" r="1.5" />
                </svg>
              </td>
              <td className="px-4 py-3 font-medium">{cat.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-secondary)]">
                {cat.slug}
              </td>
              <td className="px-4 py-3">
                <Badge color={cat.active ? "green" : "red"}>
                  {cat.active
                    ? t("admin.categories.active")
                    : t("admin.categories.inactive")}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/categories/${cat._id}/edit`}
                  className="text-[var(--theme-primary)] hover:underline"
                >
                  {t("admin.categories.edit")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
