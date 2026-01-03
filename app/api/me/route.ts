import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const userIdSchema = z.coerce.number().int().positive();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = userIdSchema.safeParse(url.searchParams.get("userId"));

    if (!parsed.success) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const userId = parsed.data;

    const user = await prisma.user_employee.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        user_name: true,
        username: true,
        email: true,
        mobile_phone: true,
        role_id: true,
        profile_picture: true,
        profile_picture_bytes: true,
        profile_picture_updated_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profilePictureUrl = user.profile_picture_bytes
      ? `/api/me/profile-picture?userId=${user.user_id}&v=${user.profile_picture_updated_at?.getTime() ?? Date.now()}`
      : user.profile_picture;

    return NextResponse.json({
      data: {
        id: user.user_id,
        user_name: user.user_name,
        username: user.username,
        email: user.email,
        mobile_phone: user.mobile_phone,
        role_id: user.role_id,
        profile_picture: profilePictureUrl,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}
