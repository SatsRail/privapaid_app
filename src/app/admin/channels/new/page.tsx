import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";
import config from "@/config/instance";
import ChannelForm from "../ChannelForm";

export const dynamic = "force-dynamic";

export default async function NewChannelPage() {
  await connectDB();
  const categories = await Category.find({ active: true })
    .sort({ position: 1 })
    .select("name")
    .lean();

  const cats = categories.map((c) => ({
    _id: String(c._id),
    name: c.name,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">New Channel</h1>
      <ChannelForm categories={cats} nsfwEnabled={config.nsfw} />
    </div>
  );
}
