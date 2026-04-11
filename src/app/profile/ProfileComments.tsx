"use client";

import Link from "next/link";

interface CommentData {
  _id: string;
  body: string;
  nickname: string;
  created_at: string;
  media: {
    _id: string;
    name: string;
    channel_slug: string | null;
    channel_name: string | null;
  } | null;
}

export default function ProfileComments({
  comments,
  emptyMessage,
}: {
  comments: CommentData[];
  emptyMessage: string;
}) {
  if (comments.length === 0) {
    return (
      <p
        className="py-8 text-center text-sm"
        style={{ color: "var(--theme-text-secondary)" }}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {comments.map((c) => (
        <div
          key={c._id}
          className="rounded-lg border px-4 py-3"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-bg)",
          }}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            {c.media ? (
              <Link
                href={`/c/${c.media.channel_slug}/${c.media._id}`}
                className="truncate text-sm font-medium hover:underline"
                style={{ color: "var(--theme-primary)" }}
              >
                {c.media.name}
                {c.media.channel_name && (
                  <span
                    className="ml-1 font-normal"
                    style={{ color: "var(--theme-text-secondary)" }}
                  >
                    in {c.media.channel_name}
                  </span>
                )}
              </Link>
            ) : (
              <span
                className="text-sm italic"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                Deleted media
              </span>
            )}
            <span
              className="shrink-0 text-xs"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              {new Date(c.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--theme-text)" }}>
            {c.body}
          </p>
        </div>
      ))}
    </div>
  );
}
