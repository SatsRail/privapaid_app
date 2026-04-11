import { t } from "@/i18n";

interface UnavailableWallProps {
  variant: "card" | "overlay";
  thumbnailUrl?: string;
  mediaName: string;
  locale: string;
}

export default function UnavailableWall({
  variant,
  thumbnailUrl,
  mediaName,
  locale,
}: UnavailableWallProps) {
  if (variant === "card") {
    return (
      <div className="mb-6">
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          <div className="flex flex-col items-center px-4 py-6">
            <div className="flex flex-col items-center gap-3 w-full max-w-sm">
              <div className="flex items-center gap-2 mb-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-lg font-semibold">{t(locale, "viewer.media.not_available")}</span>
              </div>
              <div className="w-full rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-center">
                <span className="text-sm text-zinc-400">{t(locale, "viewer.media.not_available_description")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      {thumbnailUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={mediaName}
            className="w-full opacity-30"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-zinc-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-sm text-zinc-300">{t(locale, "viewer.media.not_available")}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-zinc-500">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-sm text-zinc-400">{t(locale, "viewer.media.not_available")}</p>
        </div>
      )}
    </div>
  );
}
