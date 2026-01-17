import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);

  const { redirect } = await import("next/navigation");

  if (!Number.isFinite(productId)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div>Invalid product id</div>
      </div>
    );
  }

  const p = await prisma.product.findUnique({
    where: { product_id: productId },
    select: { name: true },
  });

  if (!p) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div>Product not found</div>
      </div>
    );
  }

  redirect(`/products/${encodeURIComponent(p.name)}`);
}
