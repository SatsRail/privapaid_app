import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireAdminApi } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  await connectDB();
  const { id } = await params;

  const media = await Media.findById(id)
    .select("source_url media_type name")
    .lean();

  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await audit({
    actorId: auth.id,
    actorEmail: auth.email,
    actorType: "admin",
    action: "media.preview",
    targetType: "media",
    targetId: id,
    details: { name: media.name },
  });

  return NextResponse.json({
    source_url: media.source_url,
    media_type: media.media_type,
  });
}
