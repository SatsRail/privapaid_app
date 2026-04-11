import Link from "next/link";

interface ServerPaginationProps {
  page: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}

function buildUrl(baseUrl: string, page: number, searchParams?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) params.set(k, v);
    }
  }
  params.set("page", String(page));
  return `${baseUrl}?${params.toString()}`;
}

export default function ServerPagination({
  page,
  totalPages,
  baseUrl,
  searchParams,
}: ServerPaginationProps) {
  if (totalPages <= 1) return null;

  const prevUrl = page > 1 ? buildUrl(baseUrl, page - 1, searchParams) : null;
  const nextUrl = page < totalPages ? buildUrl(baseUrl, page + 1, searchParams) : null;

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {prevUrl ? (
        <Link
          href={prevUrl}
          className="rounded-md border border-[var(--theme-border)] px-3 py-1.5 text-sm hover:bg-[var(--theme-bg-secondary)]"
        >
          Previous
        </Link>
      ) : (
        <span className="rounded-md border border-[var(--theme-border)] px-3 py-1.5 text-sm opacity-50">
          Previous
        </span>
      )}
      <span className="px-3 text-sm text-[var(--theme-text-secondary)]">
        {page} of {totalPages}
      </span>
      {nextUrl ? (
        <Link
          href={nextUrl}
          className="rounded-md border border-[var(--theme-border)] px-3 py-1.5 text-sm hover:bg-[var(--theme-bg-secondary)]"
        >
          Next
        </Link>
      ) : (
        <span className="rounded-md border border-[var(--theme-border)] px-3 py-1.5 text-sm opacity-50">
          Next
        </span>
      )}
    </div>
  );
}
