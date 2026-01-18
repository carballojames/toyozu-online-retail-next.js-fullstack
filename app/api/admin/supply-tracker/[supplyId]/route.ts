import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const paramsSchema = z.object({
  supplyId: z.coerce.number().int().positive(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ supplyId: string }> },
) {
  try {
    const rawParams = await context.params;
    const parsed = paramsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid supplyId" }, { status: 400 });
    }

    const supplyId = parsed.data.supplyId;

    const supply = await prisma.supply.findUnique({
      where: { supply_id: supplyId },
      select: {
        supply_id: true,
        receipt_number: true,
        total_cost: true,
        date: true,
        supplier: { select: { supplier_id: true, name: true } },
        supply_details: {
          select: {
            id: true,
            quantity: true,
            price: true,
            sub_total: true,
            product: { select: { name: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!supply) {
      return NextResponse.json({ error: "Supply not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        supplyId: supply.supply_id,
        receiptNumber: supply.receipt_number,
        supplierName: supply.supplier?.name ?? "",
        date: supply.date ? new Date(supply.date).toISOString().slice(0, 10) : "",
        totalPurchasePrice: Number(supply.total_cost ?? 0),
        items: supply.supply_details.map((li) => ({
          id: String(li.id),
          name: li.product?.name ?? "",
          quantity: Number(li.quantity ?? 0),
          purchasePrice: Number(li.price ?? 0),
          subtotal: Number(li.sub_total ?? 0),
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load supply receipt" }, { status: 500 });
  }
}
