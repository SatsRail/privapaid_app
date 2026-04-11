import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-helpers";
import { getInstanceConfig } from "@/config/instance";
import AdminSidebar from "./AdminSidebar";
import LocaleProvider from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const adminTheme = {
  "--theme-bg": "#ffffff",
  "--theme-bg-secondary": "#f4f4f5",
  "--theme-text": "#18181b",
  "--theme-text-secondary": "#71717a",
  "--theme-heading": "#09090b",
  "--theme-border": "#e4e4e7",
} as React.CSSProperties;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const instanceConfig = await getInstanceConfig();
  const adminLocale = (instanceConfig.locale || "en") as Locale;

  return (
    <LocaleProvider locale={adminLocale}>
      <div className="flex min-h-screen">
        <AdminSidebar adminName={admin.name} adminRole={admin.role} />
        <main
          className="flex-1 bg-[var(--theme-bg)] p-6 text-[var(--theme-text)] lg:p-8"
          style={adminTheme}
        >
          {children}
        </main>
      </div>
    </LocaleProvider>
  );
}
