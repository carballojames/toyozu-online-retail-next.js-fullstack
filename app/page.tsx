import LandingPage from "./landing/landing";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function Home() {
  const products = await prisma.product.findMany({
    select: {
      product_id: true,
      name: true,
      description: true,
      selling_price: true,
      quantity: true,
      brand: { select: { name: true } },
      product_image: {
        select: { id: true, image: true, image_mime: true, image_updated_at: true },
        orderBy: { id: "asc" },
        take: 1,
      },
    },
    orderBy: { product_id: "desc" },
    take: 100,
  });

  const initialProducts = products.map((p) => {
    const first = p.product_image?.[0];
    const v = first?.image_updated_at ? first.image_updated_at.getTime() : 0;
    const hasBytes = Boolean(first?.image_mime);
    const raw = first?.image?.trim() ?? "";
    const publicUrl = raw
      ? raw.startsWith("/")
        ? raw
        : raw.includes("/")
          ? `/${raw}`
          : `/products/${raw}`
      : "";

    const url = first
      ? hasBytes
        ? `/api/products/${p.product_id}/images/${first.id}?v=${v}`
        : publicUrl
      : "";

    return {
      product_id: p.product_id,
      name: p.name,
      description: p.description ?? undefined,
      selling_price: Number(p.selling_price ?? 0),
      quantity: Number(p.quantity ?? 0),
      brand_name: p.brand?.name ?? undefined,
      images: url ? [{ image: url }] : undefined,
    };
  });

  return <LandingPage initialProducts={initialProducts} />;
}