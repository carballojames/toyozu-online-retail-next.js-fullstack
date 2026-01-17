import { prisma } from "@/lib/prisma";

import {
  type CompatibilityRow,
  type ProductCard,
  type ProductDetail,
} from "./types";

import ProductDetailClient from "./ProductDetailClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizePublicImagePath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.includes("/")) return `/${trimmed}`;
  return `/products/${trimmed}`;
}

function getPrismaErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if (!("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isRetryableDatabaseError(error: unknown): boolean {
  return getPrismaErrorCode(error) === "P1017";
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);

  const { redirect } = await import("next/navigation");

  // Backward compat: if someone hits /products/123 treat it as an old id.
  const maybeId = Number(decoded);
  if (Number.isFinite(maybeId) && maybeId > 0) {
    const p = await prisma.product.findUnique({
      where: { product_id: maybeId },
      select: { name: true },
    });

    if (p?.name) {
      redirect(`/products/${encodeURIComponent(p.name)}`);
    }

    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div>Product not found</div>
      </div>
    );
  }

  const queryProduct = async () => {
    return prisma.product.findFirst({
      where: {
        name: {
          equals: decoded,
          mode: "insensitive",
        },
      },
      select: {
        product_id: true,
        name: true,
        description: true,
        selling_price: true,
        quantity: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        product_image: {
          select: { id: true, image: true, image_mime: true, image_updated_at: true },
          orderBy: { id: "asc" },
          take: 10,
        },
      },
      orderBy: { product_id: "desc" },
    });
  };

  let p: Awaited<ReturnType<typeof queryProduct>> | null = null;
  try {
    try {
      p = await queryProduct();
    } catch (e) {
      if (isRetryableDatabaseError(e)) {
        await delay(250);
        p = await queryProduct();
      } else {
        throw e;
      }
    }
  } catch (e) {
    console.error("Product page query failed:", e);
    p = null;
  }

  if (!p) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div>Product not found</div>
      </div>
    );
  }

  // If the decoded name doesn't match canonical casing, redirect to canonical.
  if (decoded !== p.name) {
    redirect(`/products/${encodeURIComponent(p.name)}`);
  }

  const images = (p.product_image ?? [])
    .map((img) => {
      const v = img.image_updated_at ? new Date(img.image_updated_at).getTime() : 0;
      const hasBytes = Boolean(img.image_mime);
      const raw = img.image ?? "";
      const url = hasBytes
        ? `/api/products/${p.product_id}/images/${img.id}?v=${v}`
        : normalizePublicImagePath(raw);

      if (!url) return null;
      return { id: img.id, image: url };
    })
    .filter((x): x is { id: number; image: string } => x !== null);

  const product: ProductDetail = {
    product_id: p.product_id,
    name: p.name,
    description: p.description ?? undefined,
    selling_price: Number(p.selling_price ?? 0),
    quantity: Number(p.quantity ?? 0),
    brand_name: p.brand?.name ?? undefined,
    category_name: p.category?.name ?? undefined,
    images: images.length ? images : undefined,
  };

  const compatRows = await prisma.product_car_compatibility.findMany({
    where: { product_id: p.product_id },
    select: {
      id: true,
      car_models: {
        select: {
          model_name: true,
          cars: { select: { make: true } },
        },
      },
      product_years_product_car_compatibility_start_year_idToproduct_years: {
        select: { year: true },
      },
      product_years_product_car_compatibility_end_year_idToproduct_years: {
        select: { year: true },
      },
    },
    orderBy: [{ start_year_id: "asc" }, { end_year_id: "asc" }, { id: "asc" }],
  });

  const compatibility: CompatibilityRow[] = compatRows.map((r) => ({
    id: r.id,
    make: r.car_models?.cars?.make ?? "",
    model_name: r.car_models?.model_name ?? "",
    start_year:
      r.product_years_product_car_compatibility_start_year_idToproduct_years?.year ??
      null,
    end_year:
      r.product_years_product_car_compatibility_end_year_idToproduct_years?.year ??
      null,
  }));

  const related = await prisma.product.findMany({
    select: {
      product_id: true,
      name: true,
      description: true,
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
    take: 20,
  });

  const relatedProducts: ProductCard[] = related.map((rp) => {
    const first = rp.product_image?.[0];
    const v = first?.image_updated_at ? new Date(first.image_updated_at).getTime() : 0;
    const hasBytes = Boolean(first?.image_mime);
    const raw = first?.image ?? "";
    const url = first
      ? hasBytes
        ? `/api/products/${rp.product_id}/images/${first.id}?v=${v}`
        : normalizePublicImagePath(raw)
      : "";

    return {
      product_id: rp.product_id,
      name: rp.name,
      description: rp.description ?? undefined,
      selling_price: Number(rp.selling_price ?? 0),
      quantity: Number(rp.quantity ?? 0),
      brand_name: rp.brand?.name ?? undefined,
      category_name: rp.category?.name ?? undefined,
      images: url ? [{ image: url }] : undefined,
      rating: 0,
      reviews: 0,
    };
  });

  return (
    <ProductDetailClient
      product={product}
      compatibility={compatibility}
      relatedProducts={relatedProducts}
    />
  );
}
