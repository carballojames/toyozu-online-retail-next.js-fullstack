import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const querySchema = z.object({
  range: z.enum(["today", "7d", "30d", "all"]).optional().default("7d"),
  deliveredDay: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  // Prisma Decimal (decimal.js) typically exposes toString().
  if (typeof (value as { toString?: () => string }).toString === "function") {
    const n = Number((value as { toString: () => string }).toString());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function buildRange(range: "today" | "7d" | "30d" | "all"): { start?: Date; endExclusive?: Date } {
  if (range === "all") return {};

  const now = new Date();
  const endExclusive = addDays(startOfDay(now), 1);

  if (range === "today") {
    return { start: startOfDay(now), endExclusive };
  }

  const days = range === "7d" ? 7 : 30;
  const start = addDays(startOfDay(now), -(days - 1));
  return { start, endExclusive };
}

function parseDay(yyyyMmDd: string): { start: Date; endExclusive: Date } {
  const [y, m, d] = yyyyMmDd.split("-").map((x) => Number.parseInt(x, 10));
  const start = new Date(y, m - 1, d);
  start.setHours(0, 0, 0, 0);
  const endExclusive = addDays(start, 1);
  return { start, endExclusive };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      range: url.searchParams.get("range") ?? undefined,
      deliveredDay: url.searchParams.get("deliveredDay") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const { range, deliveredDay } = parsed.data;
    const { start, endExclusive } = buildRange(range);

    const deliveriesRangeWhere =
      start && endExclusive
        ? {
            OR: [
              { sale: { date: { gte: start, lt: endExclusive } } },
              { date: { gte: start, lt: endExclusive } },
            ],
          }
        : {};

    const [salesAgg, supplyAgg, groupedStatuses, recentDeliveries] = await Promise.all([
      prisma.sale.aggregate({
        _sum: { total_amount: true },
        ...(start && endExclusive
          ? { where: { date: { gte: start, lt: endExclusive } } }
          : {}),
      }),
      prisma.supply.aggregate({
        _sum: { total_cost: true },
        ...(start && endExclusive
          ? { where: { date: { gte: start, lt: endExclusive } } }
          : {}),
      }),
      prisma.delivery.groupBy({
        by: ["status_id"],
        _count: { _all: true },
        where: {
          sale_id: { not: null },
          ...deliveriesRangeWhere,
        },
      }),
      prisma.delivery.findMany({
        where: {
          sale_id: { not: null },
          ...deliveriesRangeWhere,
        },
        select: {
          delivery_id: true,
          sale_id: true,
          overall_total: true,
          date: true,
          delivery_statuses: { select: { status_name: true } },
          sale: { select: { date: true, user_id: true } },
        },
        orderBy: [{ delivery_id: "desc" }],
        take: 50,
      }),
    ]);

    const statusIds = groupedStatuses
      .map((g) => g.status_id)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));

    const statuses = statusIds.length
      ? await prisma.delivery_statuses.findMany({
          where: { status_id: { in: statusIds } },
          select: { status_id: true, status_name: true, sequence_order: true },
        })
      : [];

    const statusNameById = new Map(statuses.map((s) => [s.status_id, s.status_name] as const));

    const statusCounts = groupedStatuses
      .map((g) => ({
        statusId: g.status_id,
        status: g.status_id ? statusNameById.get(g.status_id) ?? "Unknown" : "Unknown",
        count: g._count._all,
      }))
      .filter((x) => x.status !== "Unknown")
      .sort((a, b) => a.status.localeCompare(b.status));

    const totalSales = toNumber(salesAgg._sum.total_amount);
    const totalSupply = toNumber(supplyAgg._sum.total_cost);
    const revenue = totalSales - totalSupply;

    const deliveredStatus = await prisma.delivery_statuses.findFirst({
      where: { status_name: { equals: "Delivered" } },
      select: { status_id: true },
    });

    const deliveredDayRange = deliveredDay ? parseDay(deliveredDay) : parseDay(new Date().toISOString().slice(0, 10));

    const deliveredCount = deliveredStatus
      ? await prisma.delivery_history.count({
          where: {
            status_id: deliveredStatus.status_id,
            timestamp_changed: {
              gte: deliveredDayRange.start,
              lt: deliveredDayRange.endExclusive,
            },
          },
        })
      : 0;

    const userIds = Array.from(
      new Set(
        recentDeliveries
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

    const recentOrders = recentDeliveries.map((d) => {
      const date = d.sale?.date ?? d.date;
      return {
        id: String(d.sale_id ?? d.delivery_id),
        date: date ? new Date(date).toISOString().slice(0, 10) : "",
        customerName: d.sale?.user_id ? nameById.get(d.sale.user_id) ?? "" : "",
        status: d.delivery_statuses?.status_name ?? "Pending",
        total: Number(d.overall_total ?? 0),
      };
    });

    // Top customers in range (best-effort from deliveries)
    const deliveriesForCustomers = await prisma.delivery.findMany({
      where: {
        sale_id: { not: null },
        sale: { user_id: { not: null } },
        ...deliveriesRangeWhere,
      },
      select: { overall_total: true, sale: { select: { user_id: true } } },
      orderBy: [{ delivery_id: "desc" }],
      take: 5000,
    });

    const customerAgg = new Map<number, { userId: number; orders: number; total: number }>();
    for (const d of deliveriesForCustomers) {
      const userId = d.sale?.user_id;
      if (!userId) continue;
      const entry = customerAgg.get(userId) ?? { userId, orders: 0, total: 0 };
      entry.orders += 1;
      entry.total += Number(d.overall_total ?? 0);
      customerAgg.set(userId, entry);
    }

    const topCustomerIds = Array.from(customerAgg.keys());
    const topCustomersNames = topCustomerIds.length
      ? await prisma.user_employee.findMany({
          where: { user_id: { in: topCustomerIds } },
          select: { user_id: true, user_name: true },
          take: 5000,
        })
      : [];

    const topNameById = new Map(topCustomersNames.map((u) => [u.user_id, u.user_name] as const));

    const topCustomers = Array.from(customerAgg.values())
      .map((x) => ({
        userId: x.userId,
        name: topNameById.get(x.userId) ?? "",
        orders: x.orders,
        total: x.total,
      }))
      .filter((x) => Boolean(x.name))
      .sort((a, b) => b.orders - a.orders || b.total - a.total)
      .slice(0, 10);

    return NextResponse.json({
      data: {
        range,
        totals: {
          totalSales,
          totalSupply,
          revenue,
        },
        statusCounts,
        recentOrders: recentOrders.slice(0, 10),
        topCustomers,
        delivered: {
          day: deliveredDayRange.start.toISOString().slice(0, 10),
          count: deliveredCount,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
