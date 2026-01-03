import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

export const runtime = "nodejs";

function safeFileName(value: string): string {
  const base = value.trim().slice(0, 100);
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return cleaned || `upload_${Date.now()}`;
}

type Params = { id: string };

type Context = {
  params: Promise<Params>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const productId = Number(id);

    if (!Number.isFinite(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const form = await request.formData();
    const items = form.getAll("files");
    const files = items.filter((x): x is File => x instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { product_id: productId },
      select: { product_id: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const created = [] as Array<{ id: number }>;

    for (const file of files) {
      if (file.size <= 0) continue;

      const input = Buffer.from(await file.arrayBuffer());

      // Higher-res than profile pictures: store up to 1200px on the longest edge.
      const optimized = await sharp(input)
        .rotate()
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      const row = await prisma.product_image.create({
        data: {
          product_id: productId,
          image: safeFileName(file.name),
          image_bytes: new Uint8Array(optimized),
          image_mime: "image/webp",
          image_updated_at: new Date(),
        },
        select: { id: true },
      });

      created.push(row);
    }

    return NextResponse.json({ data: { created } }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to upload product images" }, { status: 500 });
  }
}
