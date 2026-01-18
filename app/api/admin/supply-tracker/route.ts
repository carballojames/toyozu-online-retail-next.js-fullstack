import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
  take: z.coerce.number().int().min(1).max(1000).optional().default(200),
});

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      q: url.searchParams.get("q") ?? undefined,
      take: url.searchParams.get("take") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const q = normalizeText(parsed.data.q);
    const take = parsed.data.take;

    const supplies = await prisma.supply.findMany({
      select: {
        supply_id: true,
        receipt_number: true,
        total_cost: true,
        date: true,
        supplier: { select: { name: true } },
        supply_details: { select: { quantity: true } },
      },
      orderBy: [{ supply_id: "desc" }],
      take,
    });

    const data = supplies
      .map((s) => {
        const itemCount = (s.supply_details ?? []).reduce(
          (sum, li) => sum + Number(li.quantity ?? 0),
          0,
        );

        return {
          supplyId: s.supply_id,
          receiptNumber: s.receipt_number,
          supplierName: s.supplier?.name ?? "",
          itemsBought: itemCount,
          totalPurchasePrice: Number(s.total_cost ?? 0),
          date: s.date ? new Date(s.date).toISOString().slice(0, 10) : "",
        };
      })
      .filter((row) => {
        if (!q) return true;
        const hay = `${row.receiptNumber} ${row.supplierName} ${row.supplyId}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to load supply tracker" }, { status: 500 });
  }
}
