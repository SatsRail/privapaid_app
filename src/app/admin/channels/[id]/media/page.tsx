import { redirect } from "next/navigation";

// Redirect to the channel detail page which shows media
export default async function MediaListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/channels/${id}`);
}
