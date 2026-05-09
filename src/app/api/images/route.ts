import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGridFSBucket, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/gridfs";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const limited = await rateLimit("image_upload", 30);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const context = (formData.get("context") as string) || "general";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
      { status: 422 }
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 5MB)" },
      { status: 422 }
    );
  }

  // Customers can only upload their own profile image
  if (session.user.type === "customer" && context !== "customer_profile") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Wrap everything past basic validation in a top-level try/catch so any
  // unhandled throw (sharp native binding missing, GridFS connect failure,
  // file-type module issue, etc.) returns a JSON error rather than a Next
  // default 500 HTML page — which the client can't parse and reports as
  // a generic "Upload failed" with no detail.
  try {
    const bucket = await getGridFSBucket();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Verify magic bytes match the claimed MIME type
    const { fileTypeFromBuffer } = await import("file-type");
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED_IMAGE_TYPES.includes(detected.mime)) {
      return NextResponse.json(
        { error: "File content does not match an allowed image type" },
        { status: 422 }
      );
    }

    // Validate image dimensions (max 8192x8192) to prevent decompression bombs
    const sharp = (await import("sharp")).default;
    try {
      const metadata = await sharp(buffer).metadata();
      if (
        metadata.width &&
        metadata.height &&
        (metadata.width > 8192 || metadata.height > 8192)
      ) {
        return NextResponse.json(
          {
            error: `Image too large: ${metadata.width}x${metadata.height} (max 8192x8192)`,
          },
          { status: 422 }
        );
      }
    } catch (err) {
      console.error("images.POST: sharp metadata read failed", err);
      const message = err instanceof Error ? err.message : "metadata error";
      return NextResponse.json(
        { error: `Unable to read image dimensions: ${message}` },
        { status: 422 }
      );
    }

    // Strip EXIF/IPTC/XMP metadata (privacy: removes GPS coordinates, camera info, etc.)
    // .rotate() applies EXIF orientation before stripping
    let strippedBuffer: Buffer;
    try {
      strippedBuffer = await sharp(buffer).rotate().toBuffer();
    } catch (err) {
      console.error("images.POST: sharp re-encode failed", err);
      const message = err instanceof Error ? err.message : "Image processing failed";
      return NextResponse.json(
        { error: `Image processing failed: ${message}` },
        { status: 422 }
      );
    }

    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: { contentType: file.type, context, uploaded_by: session.user.id },
    });

    await new Promise<void>((resolve, reject) => {
      uploadStream.on("finish", () => resolve());
      uploadStream.on("error", (err) => reject(err));
      uploadStream.end(strippedBuffer);
    });

    return NextResponse.json(
      { image_id: uploadStream.id.toString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("images.POST: unexpected failure", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Image upload failed: ${message}` },
      { status: 500 }
    );
  }
}
