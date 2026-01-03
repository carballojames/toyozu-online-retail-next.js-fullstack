import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  productIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "productIds is required" }, { status: 400 });
    }

    const ids = Array.from(new Set(parsed.data.productIds));

    const rows = await prisma.product.findMany({
      where: { product_id: { in: ids } },
      select: { product_id: true, weight: true },
      take: ids.length,
    });

    const weightsKg: Record<string, number> = {};
    for (const r of rows) {
      weightsKg[String(r.product_id)] = Number(r.weight ?? 0);
    }

    return NextResponse.json({ data: { weightsKg } });
  } catch {
    return NextResponse.json({ error: "Failed to load product weights" }, { status: 500 });
  }
}
