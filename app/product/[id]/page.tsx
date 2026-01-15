import { prisma } from "@/lib/prisma";

import {
  type CompatibilityRow,
  type ProductDetail,
  type ProductCard,
} from "./types";
import { unstable_cache } from "next/cache";

import ProductDetailClient from "./ProductDetailClient";

export const runtime = "nodejs";
export const revalidate = 60;

function normalizePublicImagePath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.includes("/")) return `/${trimmed}`;
  return `/products/${trimmed}`;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div>Invalid product id</div>
      </div>
    );
  }

  const getProductById = unstable_cache(
    async (idValue: number) => {
      return prisma.product.findUnique({
        where: { product_id: idValue },
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
      });
    },
    ["product-detail"],
    { revalidate }
  );

  const p = await getProductById(productId);

  if (!p) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div>Product not found</div>
      </div>
    );
  }

  const images = (p.product_image ?? [])
    .map((img) => {
      const v = img.image_updated_at ? img.image_updated_at.getTime() : 0;
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

  const getCompatibility = unstable_cache(
    async (idValue: number) => {
      return prisma.product_car_compatibility.findMany({
        where: { product_id: idValue },
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
    },
    ["product-compatibility"],
    { revalidate }
  );

  const compatRows = await getCompatibility(productId);

  const compatibility: CompatibilityRow[] = compatRows.map((r) => ({
    id: r.id,
    make: r.car_models?.cars?.make ?? "",
    model_name: r.car_models?.model_name ?? "",
    start_year:
      r.product_years_product_car_compatibility_start_year_idToproduct_years
        ?.year ?? null,
    end_year:
      r.product_years_product_car_compatibility_end_year_idToproduct_years
        ?.year ?? null,
  }));

  const getRelated = unstable_cache(
    async () => {
      return prisma.product.findMany({
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
    },
    ["product-related"],
    { revalidate }
  );

  const related = await getRelated();

  const relatedProducts: ProductCard[] = related.map((rp) => {
    const first = rp.product_image?.[0];
    const v = first?.image_updated_at ? first.image_updated_at.getTime() : 0;
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
