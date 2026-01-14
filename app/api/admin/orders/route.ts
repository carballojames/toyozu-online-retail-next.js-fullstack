import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const querySchema = z.object({
  status: z.string().trim().max(100).optional(),
  includeDelivered: z.coerce.boolean().optional().default(false),
});

function normalizeStatus(statusName: string | null | undefined): string {
  const s = (statusName ?? "").trim();
  return s || "Pending";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      includeDelivered: url.searchParams.get("includeDelivered") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const { status, includeDelivered } = parsed.data;

    const deliveries = await prisma.delivery.findMany({
      where: {
        sale_id: { not: null },
        ...(status ? { delivery_statuses: { status_name: status } } : {}),
        ...(!includeDelivered ? { delivery_statuses: { status_name: { not: "Delivered" } } } : {}),
      },
      select: {
        delivery_id: true,
        sale_id: true,
        overall_total: true,
        date: true,
        delivery_statuses: { select: { status_name: true } },
        sale: {
          select: {
            date: true,
            user_id: true,
          },
        },
      },
      orderBy: [{ delivery_id: "desc" }],
      take: 200,
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
          take: 500,
        })
      : [];

    const nameById = new Map(users.map((u) => [u.user_id, u.user_name] as const));

    const data = deliveries.map((d) => {
      const date = d.sale?.date ?? d.date;
      return {
        id: String(d.sale_id ?? d.delivery_id),
        saleId: d.sale_id ?? null,
        deliveryId: d.delivery_id,
        date: date ? new Date(date).toISOString().slice(0, 10) : "",
        customerName: d.sale?.user_id ? nameById.get(d.sale.user_id) ?? "" : "",
        status: normalizeStatus(d.delivery_statuses?.status_name),
        total: Number(d.overall_total ?? 0),
      };
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to load admin orders" }, { status: 500 });
  }
}
