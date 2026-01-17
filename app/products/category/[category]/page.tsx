import Header from "@/app/common/Header";
import Footer from "@/app/common/Footer";
import ProductGrid from "@/components/user-components/product-components/ProductGrid";

import { prisma } from "@/lib/prisma";
import type { ProductCard } from "@/app/products/[name]/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getPrismaErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if (!("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isRetryableDatabaseError(error: unknown): boolean {
  const code = getPrismaErrorCode(error);
  return code === "P1017";
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePublicImagePath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.includes("/")) return `/${trimmed}`;
  return `/products/${trimmed}`;
}

export default async function CategoryProductsPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const categoryName = decodeURIComponent(category);

  let products:
    | {
        product_id: number;
        name: string;
        description: string | null;
        selling_price: unknown;
        quantity: number | null;
        brand: { name: string } | null;
        category: { name: string } | null;
        product_image:
          | {
              id: number;
              image: string | null;
              image_mime: string | null;
              image_updated_at: Date | null;
            }[]
          | null;
      }[] = [];

  const query = async () => {
    return prisma.product.findMany({
      where: { category: { name: categoryName } },
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
      take: 200,
    });
  };

  try {
    try {
      products = await query();
    } catch (e) {
      if (isRetryableDatabaseError(e)) {
        await delay(250);
        products = await query();
      } else {
        throw e;
      }
    }
  } catch (e) {
    console.error("Category page product query failed:", e);
    products = [];
  }

  const mapped: ProductCard[] = products.map((p) => {
    const first = p.product_image?.[0];
    const v = first?.image_updated_at ? first.image_updated_at.getTime() : 0;
    const hasBytes = Boolean(first?.image_mime);
    const raw = first?.image ?? "";
    const imageUrl = first
      ? hasBytes
        ? `/api/products/${p.product_id}/images/${first.id}?v=${v}`
        : normalizePublicImagePath(raw)
      : undefined;

    return {
      product_id: p.product_id,
      name: p.name,
      description: p.description ?? undefined,
      selling_price: Number(p.selling_price ?? 0),
      quantity: p.quantity ?? 0,
      rating: 0,
      reviews: 0,
      brand_name: p.brand?.name ?? undefined,
      category_name: p.category?.name ?? undefined,
      images: imageUrl ? [{ image: imageUrl }] : undefined,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8 px-4">
        <div className="mx-auto flex w-full max-w-[1300px] flex-row items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-6">{categoryName}</h1>
            <ProductGrid
              initialProducts={mapped}
              showMoreButton={false}
              category={categoryName}
              columns={4}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
