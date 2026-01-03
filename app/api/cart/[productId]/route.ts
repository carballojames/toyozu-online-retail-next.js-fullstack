import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { productId: string };

type Context = {
  params: Promise<Params>;
};

const userIdSchema = z.coerce.number().int().positive();
const quantitySchema = z.coerce.number().int().positive().max(999);

export async function PATCH(request: Request, context: Context) {
  try {
    const { productId } = await context.params;
    const pid = Number(productId);

    if (!Number.isFinite(pid)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const body = (await request.json()) as { userId?: unknown; quantity?: unknown };
    const parsedUser = userIdSchema.safeParse(body.userId);
    const parsedQty = quantitySchema.safeParse(body.quantity);

    if (!parsedUser.success || !parsedQty.success) {
      return NextResponse.json({ error: "userId and quantity are required" }, { status: 400 });
    }

    const userId = parsedUser.data;
    const quantity = parsedQty.data;

    const updated = await prisma.user_cart.updateMany({
      where: { user_id: userId, product_id: pid },
      data: { quantity, updated_at: new Date() },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { productId } = await context.params;
    const pid = Number(productId);

    if (!Number.isFinite(pid)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const url = new URL(request.url);
    const parsed = userIdSchema.safeParse(url.searchParams.get("userId"));
    if (!parsed.success) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const userId = parsed.data;

    await prisma.user_cart.deleteMany({ where: { user_id: userId, product_id: pid } });

    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json({ error: "Failed to delete cart item" }, { status: 500 });
  }
}
