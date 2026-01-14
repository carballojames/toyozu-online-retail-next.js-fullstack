import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const idSchema = z.coerce.number().int().positive();
const userIdSchema = z.coerce.number().int().positive();

const patchSchema = z.object({
  userId: userIdSchema,
  isDefault: z.coerce.boolean().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params;
    const addressIdParsed = idSchema.safeParse(params.id);
    if (!addressIdParsed.success) {
      return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
    }

    const body = (await request.json()) as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const addressId = addressIdParsed.data;
    const { userId, isDefault } = parsed.data;

    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({ where: { user_id: userId }, data: { is_default: false } });
      }

      await tx.address.updateMany({
        where: { address_id: addressId, user_id: userId },
        data: { is_default: isDefault ?? false },
      });
    });

    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params;
    const addressIdParsed = idSchema.safeParse(params.id);
    if (!addressIdParsed.success) {
      return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
    }

    const url = new URL(request.url);
    const userIdParsed = userIdSchema.safeParse(url.searchParams.get("userId"));
    if (!userIdParsed.success) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const addressId = addressIdParsed.data;
    const userId = userIdParsed.data;

    await prisma.address.deleteMany({ where: { address_id: addressId, user_id: userId } });

    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 });
  }
}
