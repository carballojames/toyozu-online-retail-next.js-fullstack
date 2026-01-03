import Header from "@/app/common/Header";
import Footer from "@/app/common/Footer";
import ProductNavi from "@/components/user-components/ProductNavi";
import ProductGrid from "@/components/user-components/product-components/ProductGrid";
import { prisma } from "@/lib/prisma";
import type { ProductCard } from "@/app/products/[id]/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Props = { searchParams?: Record<string, string | string[]> };

export default async function ProductsPage({ searchParams }: Props) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const page = Number(sp.page ?? 1) || 1;
  const perPage = Number(sp.perPage ?? 50) || 50;

  const where: any = {};

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

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp ?? {})) {
      if (v === undefined) continue;
      params.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    params.set("page", String(nextPage));
    return `/products?${params.toString()}`;
  };

  const products = await prisma.product.findMany({
    where,
    select: {
      product_id: true,
      name: true,
      description: true,
      selling_price: true,
      quantity: true,
      brand: { select: { name: true } },
      product_image: { select: { id: true, image: true, image_mime: true, image_updated_at: true }, orderBy: { id: "asc" }, take: 1 },
    },
    orderBy: { product_id: "desc" },
    take: perPage,
    skip: (safePage - 1) * perPage,
  });

  const mapped: ProductCard[] = products.map((p) => {
    const first = p.product_image?.[0];
    const imageUrl = first
      ? (first.image_mime ? `/api/products/${p.product_id}/images/${first.id}` : first.image)
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
      images: imageUrl ? [{ image: imageUrl }] : undefined,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8 px-4">
        <div className="w-[1300px] mx-auto flex gap-6">
          <ProductNavi />

          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-6">Products</h1>
            <ProductGrid initialProducts={mapped} showMoreButton={false} />

            <div className="flex items-center justify-between mt-8">
              <div className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages}
              </div>

              <Pagination className="justify-end">
                <PaginationContent>
                  <PaginationItem className={safePage <= 1 ? "pointer-events-none opacity-50" : undefined}>
                    <PaginationPrevious href={buildHref(Math.max(1, safePage - 1))} />
                  </PaginationItem>

                  <PaginationItem>
                    <PaginationLink href={buildHref(safePage)} isActive>
                      {safePage}
                    </PaginationLink>
                  </PaginationItem>

                  <PaginationItem className={safePage >= totalPages ? "pointer-events-none opacity-50" : undefined}>
                    <PaginationNext href={buildHref(Math.min(totalPages, safePage + 1))} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
