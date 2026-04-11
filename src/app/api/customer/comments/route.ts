import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireCustomerApi } from "@/lib/auth-helpers";
import Comment from "@/models/Comment";

export async function GET() {
  const customer = await requireCustomerApi();
  if (customer instanceof NextResponse) return customer;

  await connectDB();

  const comments = await Comment.find({ customer_id: customer.id })
    .sort({ created_at: -1 })
    .limit(100)
    .populate({
      path: "media_id",
      select: "name channel_id",
      populate: { path: "channel_id", select: "name slug" },
    })
    .lean();

  const data = comments.map((c) => {
    const media = c.media_id as unknown as {
      _id: string;
      name: string;
      channel_id: { _id: string; name: string; slug: string } | null;
    } | null;

    return {
      _id: String(c._id),
      body: c.body,
      nickname: c.nickname,
      created_at: c.created_at,
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

  return NextResponse.json({ data });
}
