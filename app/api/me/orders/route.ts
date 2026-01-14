import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const querySchema = z.object({
  userId: z.coerce.number().int().positive(),
  q: z.string().trim().max(255).optional(),
});

function normalizeStatus(statusName: string | null | undefined): string {
  const s = (statusName ?? "").trim();
  return s || "Pending";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      userId: url.searchParams.get("userId"),
      q: url.searchParams.get("q") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { userId, q } = parsed.data;
    const qTrim = q?.trim() ?? "";
    const qNumber = qTrim ? Number(qTrim) : NaN;
    const hasNumber = Number.isFinite(qNumber) && qNumber > 0;

    const where = {
      sale: { user_id: userId },
      ...(qTrim
        ? {
            OR: [
              ...(hasNumber ? [{ sale_id: Math.floor(qNumber) }] : []),
              { tracking_number: { contains: qTrim, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const deliveries = await prisma.delivery.findMany({
      where,
      select: {
        delivery_id: true,
        sale_id: true,
        overall_total: true,
        date: true,
        tracking_number: true,
        delivery_statuses: { select: { status_name: true } },
        sale: {
          select: {
            sale_id: true,
            date: true,
            sale_details: { select: { quantity: true } },
          },
        },
      },
      orderBy: [{ delivery_id: "desc" }],
      take: 100,
    });

    const data = deliveries.map((d) => {
      const itemsCount = (d.sale?.sale_details ?? []).reduce((sum, x) => sum + (x.quantity ?? 0), 0);
      const date = d.sale?.date ?? d.date;

      return {
        id: String(d.sale_id ?? d.sale?.sale_id ?? d.delivery_id),
        saleId: d.sale_id ?? d.sale?.sale_id ?? null,
        deliveryId: d.delivery_id,
        date: date ? new Date(date).toISOString().slice(0, 10) : "",
        status: normalizeStatus(d.delivery_statuses?.status_name),
        total: Number(d.overall_total ?? 0),
        trackingNumber: d.tracking_number ?? null,
        itemsCount,
      };
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
