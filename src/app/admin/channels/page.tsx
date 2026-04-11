import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import Channel from "@/models/Channel";
import Badge from "@/components/ui/Badge";
import { t } from "@/i18n";
import { getInstanceConfig } from "@/config/instance";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const { locale } = await getInstanceConfig();
  await connectDB();
  const channels = await Channel.find()
    .sort({ created_at: -1 })
    .populate("category_id", "name")
    .lean();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t(locale, "admin.channels.title")}</h1>
        <Link
          href="/admin/channels/new"
          className="rounded-md bg-[var(--theme-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t(locale, "admin.channels.new")}
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--theme-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--theme-bg-secondary)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">Ref</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">{t(locale, "admin.channels.name")}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">{t(locale, "admin.channels.slug")}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">{t(locale, "admin.channels.category")}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">{t(locale, "admin.channels.media")}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--theme-text-secondary)]">{t(locale, "admin.channels.status")}</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--theme-text-secondary)]">{t(locale, "admin.channels.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--theme-border)]">
            {channels.map((ch) => {
              const cat = ch.category_id as { name?: string } | null;
              return (
                <tr key={String(ch._id)} className="hover:bg-[var(--theme-bg-secondary)]">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-secondary)]">
                    {ch.ref != null ? `ch_${ch.ref}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/channels/${ch._id}`} className="hover:text-[var(--theme-primary)]">
                      {ch.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-secondary)]">{ch.slug}</td>
                  <td className="px-4 py-3 text-[var(--theme-text-secondary)]">{cat?.name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--theme-text-secondary)]">{ch.media_count}</td>
                  <td className="px-4 py-3">
                    <Badge color={ch.active ? "green" : "red"}>
                      {ch.active ? t(locale, "admin.channels.active") : t(locale, "admin.channels.inactive")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/channels/${ch._id}/edit`}
                      className="text-[var(--theme-primary)] hover:underline"
                    >
                      {t(locale, "admin.channels.edit")}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {channels.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--theme-text-secondary)]">
                  {t(locale, "admin.channels.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
