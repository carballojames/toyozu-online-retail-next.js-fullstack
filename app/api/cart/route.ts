import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const userIdSchema = z.coerce.number().int().positive();

const addSchema = z.object({
  userId: userIdSchema,
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().max(999).default(1),
});

function toPublicProductImageUrl(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.includes("/")) return `/${trimmed}`;
  return `/products/${trimmed}`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = userIdSchema.safeParse(url.searchParams.get("userId"));
    if (!parsed.success) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const userId = parsed.data;

    const rows = await prisma.user_cart.findMany({
      where: { user_id: userId },
      select: {
        product_id: true,
        quantity: true,
        price_at_addition: true,
        product: {
          select: {
            product_id: true,
            name: true,
            selling_price: true,
            brand: { select: { name: true } },
            category: { select: { name: true } },
            product_image: {
              select: { id: true, image: true, image_mime: true, image_updated_at: true },
              orderBy: { id: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { updated_at: "desc" },
      take: 50,
    });

    const items = rows.map((r) => {
      const first = r.product?.product_image?.[0];
      const v = first?.image_updated_at ? first.image_updated_at.getTime() : 0;
      const hasBytes = Boolean(first?.image_mime);
      const url = first
        ? hasBytes
          ? `/api/products/${r.product_id}/images/${first.id}?v=${v}`
          : toPublicProductImageUrl(first.image)
        : "";

      return {
        product: String(r.product_id),
        product_name: r.product?.name ?? "",
        product_image: url || undefined,
        brand_name: r.product?.brand?.name ?? undefined,
        category_name: r.product?.category?.name ?? undefined,
        selling_price: Number(r.product?.selling_price ?? 0),
        quantity: Number(r.quantity ?? 1),
        price_at_addition: Number(r.price_at_addition ?? 0),
      };
    });

    return NextResponse.json({ data: { items, maxItems: 30 } });
  } catch {
    return NextResponse.json({ error: "Failed to load cart" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = addSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "userId, productId, quantity are required" }, { status: 400 });
    }

    const { userId, productId, quantity } = parsed.data;

    const product = await prisma.product.findUnique({
      where: { product_id: productId },
      select: { product_id: true, selling_price: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const existing = await prisma.user_cart.findFirst({
      where: { user_id: userId, product_id: productId },
      select: { cart_id: true, quantity: true },
    });

    if (!existing) {
      const count = await prisma.user_cart.count({ where: { user_id: userId } });
      if (count >= 30) {
        return NextResponse.json(
          { error: "Cart limit reached (30 items). Remove an item to add more." },
          { status: 400 },
        );
      }

      await prisma.user_cart.create({
        data: {
          user_id: userId,
          product_id: productId,
          quantity,
          price_at_addition: String(product.selling_price ?? 0),
        },
        select: { cart_id: true },
      });

      return NextResponse.json({ data: { created: true } }, { status: 201 });
    }

    await prisma.user_cart.update({
      where: { cart_id: existing.cart_id },
      data: { quantity: existing.quantity + quantity, updated_at: new Date() },
      select: { cart_id: true },
    });

    return NextResponse.json({ data: { created: false } });
  } catch {
    return NextResponse.json({ error: "Failed to add to cart" }, { status: 500 });
  }
}
