import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const userIdSchema = z.coerce.number().int().positive();

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB input limit
const PROFILE_IMAGE_SIZE = 256; // output resolution (square)
const WEBP_QUALITY = 80;

function sanitizeImageBytes(bytes: Buffer): boolean {
  return bytes.length > 0 && bytes.length <= MAX_UPLOAD_BYTES;
}

const userIdQuerySchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = userIdQuerySchema.safeParse({ userId: url.searchParams.get("userId") });
    if (!parsed.success) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { userId } = parsed.data;
    const user = await prisma.user_employee.findUnique({
      where: { user_id: userId },
      select: {
        profile_picture_bytes: true,
        profile_picture_mime: true,
        profile_picture_updated_at: true,
      },
    });

    if (!user?.profile_picture_bytes) {
      return NextResponse.json({ error: "Profile picture not found" }, { status: 404 });
    }

    const body = Buffer.from(user.profile_picture_bytes);
    const contentType = user.profile_picture_mime ?? "image/webp";

    // Use query param `v=` (set by /api/me) to make this safe to cache aggressively.
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(body.length),
        "Last-Modified": user.profile_picture_updated_at
          ? new Date(user.profile_picture_updated_at).toUTCString()
          : new Date().toUTCString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load profile picture" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    const userIdParsed = userIdSchema.safeParse(form.get("userId"));
    if (!userIdParsed.success) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const userId = userIdParsed.data;
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!sanitizeImageBytes(bytes)) {
      return NextResponse.json(
        { error: bytes.length === 0 ? "Empty file" : "File too large" },
        { status: 400 },
      );
    }

    // Convert to a fixed-size WebP for consistent rendering + smaller payloads.
    const optimized = await sharp(bytes)
      .rotate() // respect EXIF orientation
      .resize(PROFILE_IMAGE_SIZE, PROFILE_IMAGE_SIZE, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const optimizedBytes = Uint8Array.from(optimized);

    const updatedAt = new Date();
    const publicUrl = `/api/me/profile-picture?userId=${userId}&v=${updatedAt.getTime()}`;

    await prisma.user_employee.update({
      where: { user_id: userId },
      data: {
        profile_picture: null,
        profile_picture_bytes: optimizedBytes,
        profile_picture_mime: "image/webp",
        profile_picture_updated_at: updatedAt,
      },
    });

    return NextResponse.json({ data: { profile_picture: publicUrl } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
