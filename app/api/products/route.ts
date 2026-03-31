import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;

function isLocalDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || (process.env.VERCEL && isLocalDatabaseUrl(databaseUrl))) {
      return NextResponse.json(
        {
          error:
            "Database is not configured for deployment. Set DATABASE_URL to a hosted Postgres URL (not localhost).",
        },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const rawPage = Number(searchParams.get("page") ?? DEFAULT_PAGE);
    const rawPageSize = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);
    const q = (searchParams.get("q") ?? "").trim();

    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : DEFAULT_PAGE;
    const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(Math.floor(rawPageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const numericQ = Number(q);

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { brand: { is: { name: { contains: q, mode: "insensitive" as const } } } },
            { category: { is: { name: { contains: q, mode: "insensitive" as const } } } },
            ...(Number.isFinite(numericQ) && numericQ > 0
              ? [{ product_id: Math.floor(numericQ) }]
              : []),
          ],
        }
      : undefined;

    const total = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
      where,
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
      skip: (page - 1) * pageSize,
      take: pageSize,
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

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      data: withUrls,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
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
