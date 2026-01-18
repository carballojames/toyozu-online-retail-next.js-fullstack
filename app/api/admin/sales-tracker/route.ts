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

    const deliveredStatus = await prisma.delivery_statuses.findUnique({
      where: { status_name: "Delivered" },
      select: { status_id: true },
    });

    const deliveries = await prisma.delivery.findMany({
      where: {
        sale_id: { not: null },
        delivery_statuses: { status_name: "Delivered" },
        sale: {
          is: {
            AND: [{ payment_type: { not: null } }, { payment_type: { not: "" } }],
          },
        },
      },
      select: {
        delivery_id: true,
        sale_id: true,
        overall_total: true,
        sale: {
          select: {
            user_id: true,
            sale_details: {
              select: { quantity: true },
            },
          },
        },
        delivery_history: deliveredStatus
          ? {
              where: { status_id: deliveredStatus.status_id },
              orderBy: { timestamp_changed: "desc" },
              take: 1,
              select: { timestamp_changed: true },
            }
          : {
              take: 0,
              select: { timestamp_changed: true },
            },
      },
      orderBy: [{ delivery_id: "desc" }],
      take,
    });

    const userIds = Array.from(
      new Set(
        deliveries
          .map((d) => d.sale?.user_id)
          .filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0),
      ),
    );

    const users = userIds.length
      ? await prisma.user_employee.findMany({
          where: { user_id: { in: userIds } },
          select: { user_id: true, user_name: true },
          take: 2000,
        })
      : [];

    const nameById = new Map(users.map((u) => [u.user_id, u.user_name] as const));

    const data = deliveries
      .map((d) => {
        const itemCount = (d.sale?.sale_details ?? []).reduce(
          (sum, li) => sum + Number(li.quantity ?? 0),
          0,
        );
        const deliveredAt = d.delivery_history?.[0]?.timestamp_changed ?? null;

        return {
          saleId: d.sale_id ?? null,
          deliveryId: d.delivery_id,
          customerName: d.sale?.user_id ? nameById.get(d.sale.user_id) ?? "" : "",
          itemsBought: itemCount,
          totalPrice: Number(d.overall_total ?? 0),
          deliveredDate: deliveredAt ? new Date(deliveredAt).toISOString().slice(0, 10) : "",
        };
      })
      .filter((row) => {
        if (!q) return true;
        const hay = `${row.saleId ?? ""} ${row.deliveryId} ${row.customerName}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to load sales tracker" }, { status: 500 });
  }
}
