import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const paramsSchema = z.object({
  saleId: z.coerce.number().int().positive(),
});

const querySchema = z.object({
  userId: z.coerce.number().int().positive(),
});

function buildAddressText(a: {
  street_house_building_no: string | null;
  barangay?: {
    name: string;
    municipality?: { name: string; province?: { name: string } | null } | null;
  } | null;
} | null): string {
  if (!a) return "";
  const parts = [
    a.street_house_building_no ?? "",
    a.barangay?.name ?? "",
    a.barangay?.municipality?.name ?? "",
    a.barangay?.municipality?.province?.name ?? "",
  ].filter((x) => x && x.trim());
  return parts.join(", ");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ saleId: string }> },
) {
  try {
    const rawParams = await context.params;
    const saleId = rawParams.saleId;

    const url = new URL(request.url);
    const parsedParams = paramsSchema.safeParse({ saleId });
    const parsedQuery = querySchema.safeParse({ userId: url.searchParams.get("userId") });

    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid saleId" }, { status: 400 });
    }
    if (!parsedQuery.success) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const saleIdNum = parsedParams.data.saleId;
    const userId = parsedQuery.data.userId;

    const delivery = await prisma.delivery.findFirst({
      where: { sale_id: saleIdNum, sale: { user_id: userId } },
      select: {
        delivery_id: true,
        sale_id: true,
        overall_total: true,
        delivery_fee: true,
        tracking_number: true,
        date: true,
        delivery_statuses: { select: { status_name: true, sequence_order: true } },
        courier: { select: { name: true } },
        address: {
          select: {
            street_house_building_no: true,
            barangay: { select: { name: true, municipality: { select: { name: true, province: { select: { name: true } } } } } },
          },
        },
        sale: {
          select: {
            sale_id: true,
            date: true,
            payment_type: true,
            sale_details: {
              select: {
                quantity: true,
                selling_price: true,
                sub_total: true,
                product: { select: { name: true } },
              },
              orderBy: { sale_detail_id: "asc" },
            },
          },
        },
        delivery_history: {
          select: {
            history_id: true,
            timestamp_changed: true,
            location_details: true,
            delivery_statuses: { select: { status_name: true, sequence_order: true } },
          },
          orderBy: [{ timestamp_changed: "asc" }],
          take: 200,
        },
      },
    });

    if (!delivery) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const saleDate = delivery.sale?.date ?? delivery.date;

    return NextResponse.json({
      data: {
        saleId: delivery.sale_id,
        deliveryId: delivery.delivery_id,
        date: saleDate ? new Date(saleDate).toISOString().slice(0, 10) : "",
        paymentType: delivery.sale?.payment_type ?? "",
        status: delivery.delivery_statuses?.status_name ?? "Pending",
        trackingNumber: delivery.tracking_number ?? null,
        courier: delivery.courier?.name ?? null,
        addressText: buildAddressText(delivery.address ?? null),
        totals: {
          shipping: Number(delivery.delivery_fee ?? 0),
          total: Number(delivery.overall_total ?? 0),
        },
        items: (delivery.sale?.sale_details ?? []).map((li) => ({
          name: li.product?.name ?? "",
          quantity: Number(li.quantity ?? 0),
          subtotal: Number(li.sub_total ?? (li.selling_price ?? 0) * (li.quantity ?? 0)),
        })),
        history: delivery.delivery_history.map((h) => ({
          id: String(h.history_id),
          at: h.timestamp_changed ? new Date(h.timestamp_changed).toISOString() : null,
          status: h.delivery_statuses.status_name,
          sequence: h.delivery_statuses.sequence_order,
          location: h.location_details ?? null,
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }
}
