import Header from "@/app/common/Header";
import Footer from "@/app/common/Footer";
import ProductNavigator from "@/components/user-components/ProductNavigator";
import ProductGrid from "@/components/user-components/product-components/ProductGrid";
import { prisma } from "@/lib/prisma";
import type { ProductCard } from "@/app/products/[name]/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Props = { searchParams?: Promise<Record<string, string | string[]>> };

type ProductWhere = NonNullable<Parameters<typeof prisma.product.findMany>[0]>["where"];

export const runtime = "nodejs";
export const revalidate = 60;

function normalizePublicImagePath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.includes("/")) return `/${trimmed}`;
  return `/products/${trimmed}`;
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const page = Number(sp.page ?? 1) || 1;
  const perPage = Number(sp.perPage ?? 20) || 20;

  const where: ProductWhere = {};

  // Name search (from header): match by product name
  if (sp.name) {
    const q = String(sp.name).trim();
    if (q) where.name = { contains: q, mode: "insensitive" };
  }

  // Simple filtering: category (comma separated), brand (comma separated), price range
  if (sp.category) {
    const cats = String(sp.category).split(",").map((s) => s.trim()).filter(Boolean);
    if (cats.length) where.category = { name: { in: cats } };
  }

  if (sp.brand) {
    const brands = String(sp.brand).split(",").map((s) => s.trim()).filter(Boolean);
    if (brands.length) where.brand = { name: { in: brands } };
  }

  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.selling_price = {};
    if (minPrice !== undefined) where.selling_price.gte = Math.floor(minPrice);
    if (maxPrice !== undefined) where.selling_price.lte = Math.floor(maxPrice);
  }

  // Vehicle compatibility filtering
  // Accept either `model_id` or `car_model` as the selected car model id.
  const rawModelId = sp.model_id ?? sp.car_model;
  const modelId = rawModelId ? Number(rawModelId) : NaN;
  const year = sp.year ? Number(sp.year) : NaN;

  if (Number.isFinite(modelId) && modelId > 0) {
    where.product_car_compatibility = {
      some: {
        model_id: modelId,
        ...(Number.isFinite(year)
          ? {
              product_years_product_car_compatibility_start_year_idToproduct_years:
                { year: { lte: year } },
              product_years_product_car_compatibility_end_year_idToproduct_years:
                { year: { gte: year } },
            }
          : {}),
      },
    };
  }

  const whereKey = JSON.stringify(where);

  async function getProductCount(serializedWhere: string) {
    const parsed = JSON.parse(serializedWhere) as typeof where;
    return prisma.product.count({ where: parsed });
  }

  async function getProductsPage(serializedWhere: string, take: number, skip: number) {
    const parsed = JSON.parse(serializedWhere) as typeof where;
    return prisma.product.findMany({
      where: parsed,
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
      take,
      skip,
    });
  }

  const total = await getProductCount(whereKey);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const getVisiblePages = () => {
    const windowSize = 5;
    if (totalPages <= windowSize) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let start = Math.max(1, safePage - Math.floor(windowSize / 2));
    let end = start + windowSize - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - windowSize + 1);
    }

    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  };

  const visiblePages = getVisiblePages();

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp ?? {})) {
      if (v === undefined) continue;
      params.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    params.set("page", String(nextPage));
    return `/products?${params.toString()}`;
  };

  const products = await getProductsPage(whereKey, perPage, (safePage - 1) * perPage);

  const mapped: ProductCard[] = products.map((p) => {
    const first = p.product_image?.[0];
    const v = first?.image_updated_at ? new Date(first.image_updated_at).getTime() : 0;
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

      <main className="py-8">
        <div className="mx-auto w-full max-w-[1270px] px-4 sm:px-6">
          <h1 className="text-2xl font-bold mb-6 text-primary italic">All Products</h1>
          <ProductGrid initialProducts={mapped} showMoreButton={false} />

          <div className="mt-8 flex justify-center">
            <Pagination className="justify-center items-center">
              <PaginationContent>
                <PaginationItem className={safePage <= 1 ? "pointer-events-none opacity-50" : undefined}>
                  <PaginationPrevious href={buildHref(Math.max(1, safePage - 1))} />
                </PaginationItem>

                {visiblePages.map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink href={buildHref(p)} isActive={p === safePage}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem className={safePage >= totalPages ? "pointer-events-none opacity-50" : undefined}>
                  <PaginationNext href={buildHref(Math.min(totalPages, safePage + 1))} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
