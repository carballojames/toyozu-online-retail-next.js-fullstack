import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const idSchema = z.coerce.number().int().positive();

const patchSchema = z.object({
  isActive: z.coerce.boolean().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params;
    const idParsed = idSchema.safeParse(params.id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = (await request.json()) as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const id = idParsed.data;

    await prisma.approved_address.update({
      where: { approved_address_id: id },
      data: { is_active: parsed.data.isActive },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json({ error: "Failed to update approved address" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params;
    const idParsed = idSchema.safeParse(params.id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const id = idParsed.data;

    await prisma.approved_address.delete({ where: { approved_address_id: id } });

    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json(
      { error: "Cannot delete: address is in use (or deletion failed)." },
      { status: 409 }
    );
  }
}
