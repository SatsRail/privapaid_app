import { connectDB } from "@/lib/mongodb";
import { requireCustomer } from "@/lib/auth-helpers";
import Customer from "@/models/Customer";
import Comment from "@/models/Comment";
import { getInstanceConfig } from "@/config/instance";
import { t } from "@/i18n";
import ViewerShell from "@/components/ViewerShell";
import ProfileComments from "./ProfileComments";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireCustomer();
  const { locale } = await getInstanceConfig();
  await connectDB();

  const customer = await Customer.findById(session.id)
    .select("nickname created_at")
    .lean();

  if (!customer) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p style={{ color: "var(--theme-text-secondary)" }}>
          Customer not found.
        </p>
      </div>
    );
  }

  const comments = await Comment.find({ customer_id: session.id })
    .sort({ created_at: -1 })
    .limit(100)
    .populate({
      path: "media_id",
      select: "name channel_id",
      populate: { path: "channel_id", select: "name slug" },
    })
    .lean();

  const serializedComments = comments.map((c) => {
    const media = c.media_id as unknown as {
      _id: string;
      name: string;
      channel_id: { _id: string; name: string; slug: string } | null;
    } | null;

    return {
      _id: String(c._id),
      body: c.body,
      nickname: c.nickname,
      created_at: new Date(c.created_at).toISOString(),
      media: media
        ? {
            _id: String(media._id),
            name: media.name,
            channel_slug: media.channel_id?.slug || null,
            channel_name: media.channel_id?.name || null,
          }
        : null,
    };
  });

  return (
    <ViewerShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Profile header */}
        <div className="mb-8 flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold"
            style={{ backgroundColor: "var(--theme-primary)", color: "#000" }}
          >
            {customer.nickname.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--theme-heading)" }}
            >
              {customer.nickname}
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              {t(locale, "viewer.profile.member_since")}{" "}
              {new Date(customer.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Comments section */}
        <h2
          className="mb-4 text-lg font-semibold"
          style={{ color: "var(--theme-heading)" }}
        >
          {t(locale, "viewer.profile.comments")} ({serializedComments.length})
        </h2>

        <ProfileComments
          comments={serializedComments}
          emptyMessage={t(locale, "viewer.profile.no_comments")}
        />
      </div>
    </ViewerShell>
  );
}
