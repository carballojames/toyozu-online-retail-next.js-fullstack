import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const paramsSchema = z.object({
  saleId: z.coerce.number().int().positive(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ saleId: string }> },
) {
  try {
    const rawParams = await context.params;
    const parsed = paramsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid saleId" }, { status: 400 });
    }

    const saleId = parsed.data.saleId;

    const deliveredStatus = await prisma.delivery_statuses.findUnique({
      where: { status_name: "Delivered" },
      select: { status_id: true },
    });

    const delivery = await prisma.delivery.findFirst({
      where: { sale_id: saleId },
      select: {
        delivery_id: true,
        overall_total: true,
        sale: {
          select: {
            sale_id: true,
            payment_type: true,
            user_id: true,
            sale_details: {
              select: {
                sale_detail_id: true,
                quantity: true,
                sub_total: true,
                product: { select: { name: true } },
              },
              orderBy: { sale_detail_id: "asc" },
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
    });

    if (!delivery || !delivery.sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const customer = delivery.sale.user_id
      ? await prisma.user_employee.findUnique({
          where: { user_id: delivery.sale.user_id },
          select: { user_id: true, user_name: true },
        })
      : null;

    const deliveredAt = delivery.delivery_history?.[0]?.timestamp_changed ?? null;

    return NextResponse.json({
      data: {
        saleId: delivery.sale.sale_id,
        deliveryId: delivery.delivery_id,
        customerName: customer?.user_name ?? "",
        paymentType: delivery.sale.payment_type ?? "",
        deliveredDate: deliveredAt ? new Date(deliveredAt).toISOString().slice(0, 10) : "",
        totalPrice: Number(delivery.overall_total ?? 0),
        items: delivery.sale.sale_details.map((li) => ({
          id: String(li.sale_detail_id),
          name: li.product?.name ?? "",
          quantity: Number(li.quantity ?? 0),
          subtotal: Number(li.sub_total ?? 0),
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load sale details" }, { status: 500 });
  }
}
