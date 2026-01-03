import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

type Context = {
  params: Promise<Params>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const productId = Number(id);

    if (!Number.isFinite(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { product_id: productId },
      select: {
        product_id: true,
        name: true,
        description: true,
        purchase_price: true,
        selling_price: true,
        quantity: true,
        weight: true,
        brand_id: true,
        category_id: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        product_image: {
          select: { id: true, image: true, image_mime: true, image_updated_at: true },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const withUrls = {
      ...product,
      product_image: (product.product_image ?? []).map((img) => {
        const v = img.image_updated_at ? img.image_updated_at.getTime() : 0;
        const hasBytes = Boolean(img.image_mime);

        const raw = img.image?.trim() ?? "";
        const publicUrl = raw
          ? raw.startsWith("/")
            ? raw
            : raw.includes("/")
              ? `/${raw}`
              : `/products/${raw}`
          : "";

        const url = hasBytes
          ? `/api/products/${product.product_id}/images/${img.id}?v=${v}`
          : publicUrl;

        return { id: img.id, image: url };
      }),
    };

    return NextResponse.json({ data: withUrls });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const productId = Number(id);

    if (!Number.isFinite(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      purchase_price?: number | string | null;
      selling_price?: number | string | null;
      quantity?: number | string | null;
      weight?: number | string | null;
      brandId?: number | string | null;
      categoryId?: number | string | null;
      brandName?: string | null;
      categoryName?: string | null;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const parseNullableNumber = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
      return Number.isFinite(n) ? n : null;
    };

    const purchasePrice = parseNullableNumber(body.purchase_price);
    const sellingPrice = parseNullableNumber(body.selling_price);
    const quantity = parseNullableNumber(body.quantity);
    const weight = parseNullableNumber(body.weight);

    const brandIdNum = parseNullableNumber(body.brandId);
    const categoryIdNum = parseNullableNumber(body.categoryId);

    const brandName = body.brandName?.trim() || null;
    const categoryName = body.categoryName?.trim() || null;

    const [brand, category] = await Promise.all([
      brandIdNum
        ? prisma.brand.findUnique({ where: { brand_id: Math.floor(brandIdNum) }, select: { brand_id: true } })
        : brandName
          ? prisma.brand.findFirst({ where: { name: brandName }, select: { brand_id: true } })
          : Promise.resolve(null),
      categoryIdNum
        ? prisma.category.findUnique({ where: { category_id: Math.floor(categoryIdNum) }, select: { category_id: true } })
        : categoryName
          ? prisma.category.findFirst({ where: { name: categoryName }, select: { category_id: true } })
          : Promise.resolve(null),
    ]);

    const updated = await prisma.product.update({
      where: { product_id: productId },
      data: {
        name,
        description: body.description === null ? null : body.description?.trim() || null,
        purchase_price: purchasePrice === null ? undefined : Math.floor(purchasePrice),
        selling_price: sellingPrice === null ? undefined : Math.floor(sellingPrice),
        quantity: quantity === null ? undefined : Math.floor(quantity),
        weight: weight === null ? undefined : weight,
        brand: brand ? { connect: { brand_id: brand.brand_id } } : undefined,
        category: category ? { connect: { category_id: category.category_id } } : undefined,
      },
      select: {
        product_id: true,
        name: true,
        description: true,
        purchase_price: true,
        selling_price: true,
        quantity: true,
        weight: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const productId = Number(id);

    if (!Number.isFinite(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    // Remove dependent rows that reference product_id and would block deletion.
    // Order: remove many-to-one child rows first, then delete the product.
    await prisma.$transaction([
      prisma.product_car_compatibility.deleteMany({ where: { product_id: productId } }),
      prisma.sale_details.deleteMany({ where: { product_id: productId } }),
      prisma.supply_details.deleteMany({ where: { product_id: productId } }),
      prisma.return_item.deleteMany({ where: { product_id: productId } }),
      prisma.user_cart.deleteMany({ where: { product_id: productId } }),
      // product_image uses onDelete: Cascade; deleting explicitly is harmless.
      prisma.product_image.deleteMany({ where: { product_id: productId } }),
      prisma.product.delete({ where: { product_id: productId } }),
    ]);

    return NextResponse.json({});
  } catch (err: unknown) {
    // If the product does not exist, return 404
    if (err instanceof Error && /Record to delete does not exist/.test(err.message)) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Foreign key / constraint violations may surface as Prisma errors — return 409
    if (err instanceof Error && /foreign key constraint|constraint failed/i.test(err.message)) {
      return NextResponse.json({ error: "Unable to delete product due to related records" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
