import { getInstanceConfig } from "@/config/instance";
import MediaForm from "../MediaForm";

export const dynamic = "force-dynamic";

export default async function NewMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { currency } = await getInstanceConfig();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Add Media</h1>
      <MediaForm channelId={id} currency={currency} />
    </div>
  );
}
