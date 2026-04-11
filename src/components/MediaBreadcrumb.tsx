import Link from "next/link";
import { t } from "@/i18n";

interface MediaBreadcrumbProps {
  channelName: string;
  channelSlug: string;
  mediaName: string;
  locale: string;
}

export default function MediaBreadcrumb({
  channelName,
  channelSlug,
  mediaName,
  locale,
}: MediaBreadcrumbProps) {
  return (
    <div className="mb-4 text-sm text-zinc-400">
      <Link href="/" className="hover:text-zinc-200">
        {t(locale, "viewer.media.home")}
      </Link>
      {" / "}
      <Link href={`/c/${channelSlug}`} className="hover:text-zinc-200">
        {channelName}
      </Link>
      {" / "}
      <span className="text-zinc-200">{mediaName}</span>
    </div>
  );
}
