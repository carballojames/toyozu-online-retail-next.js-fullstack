import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        product_id: true,
        name: true,
        description: true,
        purchase_price: true,
        selling_price: true,
        quantity: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        product_image: {
          select: { id: true, image: true, image_mime: true, image_updated_at: true },
          orderBy: { id: "asc" },
          take: 1,
        },
      },
      orderBy: { product_id: "desc" },
      take: 100,
    });

    const withUrls = products.map((p) => {
      const first = p.product_image?.[0];
      if (!first) return p;

      const v = first.image_updated_at ? first.image_updated_at.getTime() : 0;
      const hasBytes = Boolean(first.image_mime);
      const raw = first.image?.trim() ?? "";
      const publicUrl = raw
        ? raw.startsWith("/")
          ? raw
          : raw.includes("/")
            ? `/${raw}`
            : `/products/${raw}`
        : "";

      const url = hasBytes
        ? `/api/products/${p.product_id}/images/${first.id}?v=${v}`
        : publicUrl;

      return {
        ...p,
        product_image: [{ image: url }],
      };
    });

    return NextResponse.json({ data: withUrls });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const created = await prisma.product.create({
      data: {
        name: String(body.name),
        description: body.description ? String(body.description) : undefined,
        purchase_price: body.purchase_price ? Number(body.purchase_price) : undefined,
        selling_price: body.selling_price ? Number(body.selling_price) : undefined,
        quantity: body.quantity ? Math.floor(Number(body.quantity)) : undefined,
        brand: body.brandId ? { connect: { brand_id: Number(body.brandId) } } : undefined,
        category: body.categoryId ? { connect: { category_id: Number(body.categoryId) } } : undefined,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
