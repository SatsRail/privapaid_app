"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useLocale } from "@/i18n/useLocale";

const navItems = [
  { href: "/admin", labelKey: "admin.sidebar.dashboard", icon: "◆" },
  { href: "/admin/categories", labelKey: "admin.sidebar.categories", icon: "▦" },
  { href: "/admin/channels", labelKey: "admin.sidebar.channels", icon: "◉" },
  { href: "/admin/products", labelKey: "admin.sidebar.products", icon: "⬡" },
  { href: "/admin/import-export", labelKey: "admin.sidebar.importExport", icon: "⇅" },
  { href: "/admin/settings", labelKey: "admin.sidebar.settings", icon: "⚙" },
  { href: "/admin/seo", labelKey: "admin.sidebar.seo", icon: "◎" },
];

interface AdminSidebarProps {
  adminName: string;
  adminRole: string;
}

export default function AdminSidebar({
  adminName,
  adminRole,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSync() {
    setSyncing(true);
    setSyncStatus("idle");

    try {
      const res = await fetch("/api/admin/settings/sync", { method: "POST" });
      if (!res.ok) {
        setSyncStatus("error");
        return;
      }
      setSyncStatus("success");
      router.refresh();
    } catch {
      setSyncStatus("error");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  }

  return (
    <aside className="flex w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-4">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: "#c9506b" }}>
            PrivaPaid
          </span>
          <span className="text-sm font-medium text-zinc-400">Stream</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <span className="text-xs">{item.icon}</span>
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* Sync button */}
      <div className="border-t border-zinc-800 px-3 py-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
            syncStatus === "success"
              ? "text-green-400"
              : syncStatus === "error"
                ? "text-red-400"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={syncing ? "animate-spin" : ""}
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {syncing
            ? t("admin.sidebar.syncing")
            : syncStatus === "success"
              ? t("admin.sidebar.synced")
              : syncStatus === "error"
                ? t("admin.sidebar.sync_failed")
                : t("admin.sidebar.sync")}
        </button>
      </div>

      <div className="border-t border-zinc-800 px-4 py-4">
        <Link
          href="/"
          className="mb-3 flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200"
        >
          {t("admin.sidebar.viewSite")} ↗
        </Link>
        <p className="truncate text-sm font-medium text-zinc-200">
          {adminName}
        </p>
        <p className="text-xs text-zinc-500 capitalize">{adminRole}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
        >
          {t("admin.sidebar.logout")}
        </button>
      </div>
    </aside>
  );
}
