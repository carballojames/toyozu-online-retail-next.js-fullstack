import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { id: string; imageId: string };

type Context = {
  params: Promise<Params>;
};

function toPublicProductImageUrl(image: string): string {
  const trimmed = image.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  // Most existing images appear to be served from /products/* in public.
  return `/products/${encodeURIComponent(trimmed)}`;
}

export async function GET(_request: Request, context: Context) {
  const { id, imageId } = await context.params;
  const productId = Number(id);
  const imgId = Number(imageId);

  if (!Number.isFinite(productId) || !Number.isFinite(imgId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const img = await prisma.product_image.findFirst({
    where: { id: imgId, product_id: productId },
    select: {
      id: true,
      image: true,
      image_bytes: true,
      image_mime: true,
      image_updated_at: true,
    },
  });

  if (!img) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }

  if (!img.image_bytes || img.image_bytes.length === 0) {
    return Response.json(
      { error: "Image bytes not available" },
      { status: 404 },
    );
  }

  const body = Buffer.from(img.image_bytes);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": img.image_mime || "image/webp",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      ...(img.image_updated_at
        ? { ETag: `\"${img.id}-${img.image_updated_at.getTime()}\"` }
        : null),
    },
  });
}

export async function DELETE(_request: Request, context: Context) {
  const { id, imageId } = await context.params;
  const productId = Number(id);
  const imgId = Number(imageId);

  if (!Number.isFinite(productId) || !Number.isFinite(imgId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const deleted = await prisma.product_image.deleteMany({
    where: { id: imgId, product_id: productId },
  });

  if (deleted.count === 0) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }

  return Response.json({ data: { deleted: true } }, { status: 200 });
}
