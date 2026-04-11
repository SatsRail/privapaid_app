export default function ChannelLoading() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Profile skeleton */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-[var(--theme-border)]" />
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-[var(--theme-border)]" />
          <div className="h-4 w-64 animate-pulse rounded bg-[var(--theme-border)]" />
        </div>
      </div>
      {/* Media grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-video animate-pulse rounded-lg bg-[var(--theme-border)]" />
        ))}
      </div>
    </div>
  );
}
