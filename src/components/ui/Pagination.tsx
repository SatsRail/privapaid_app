"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-[var(--theme-border)] px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-[var(--theme-bg-secondary)]"
      >
        Previous
      </button>
      <span className="px-3 text-sm text-[var(--theme-text-secondary)]">
        {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md border border-[var(--theme-border)] px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-[var(--theme-bg-secondary)]"
      >
        Next
      </button>
    </div>
  );
}
