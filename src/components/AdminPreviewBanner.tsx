interface AdminPreviewBannerProps {
  mediaName: string;
}

export default function AdminPreviewBanner({ mediaName }: AdminPreviewBannerProps) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-3">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-400">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="text-sm font-medium text-amber-200">
        Admin Preview
      </span>
      <span className="text-sm text-amber-400/70">— {mediaName}</span>
    </div>
  );
}
