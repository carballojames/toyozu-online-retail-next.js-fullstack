import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const paramsSchema = z.object({
  saleId: z.coerce.number().int().positive(),
});

const patchSchema = z
  .object({
    statusName: z.string().trim().min(1).max(100).optional(),
    trackingNumber: z.string().trim().max(255).optional(),
    actorUserId: z.coerce.number().int().positive().optional(),
    locationDetails: z.string().trim().max(255).optional(),
  })
  .refine((v) => v.statusName || v.trackingNumber, {
    message: "Provide statusName or trackingNumber",
  });

async function ensureDefaultStatuses() {
  const wanted = [
    { status_name: "Pending", sequence_order: 1, description: "Order placed" },
    { status_name: "Prepare to ship", sequence_order: 2, description: "Preparing items" },
    { status_name: "Pickup by courier", sequence_order: 3, description: "Handed to courier" },
    { status_name: "Tracking number posted", sequence_order: 4, description: "Tracking info available" },
    { status_name: "Delivered", sequence_order: 5, description: "Delivered" },
  ];

  for (const s of wanted) {
    await prisma.delivery_statuses.upsert({
      where: { status_name: s.status_name },
      update: {
        sequence_order: s.sequence_order,
        description: s.description,
      },
      create: s,
      select: { status_id: true },
    });
  }
}

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
    const parsedParams = paramsSchema.safeParse({ saleId: rawParams.saleId });
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid saleId" }, { status: 400 });
    }

    await ensureDefaultStatuses();

    const saleId = parsedParams.data.saleId;

    const delivery = await prisma.delivery.findFirst({
      where: { sale_id: saleId },
      select: {
        delivery_id: true,
        sale_id: true,
        overall_total: true,
        delivery_fee: true,
        tracking_number: true,
        date: true,
        delivery_statuses: { select: { status_name: true, sequence_order: true } },
        courier: { select: { courier_id: true, name: true } },
        address: {
          select: {
            address_id: true,
            street_house_building_no: true,
            barangay: { select: { name: true, municipality: { select: { name: true, province: { select: { name: true } } } } } },
          },
        },
        sale: {
          select: {
            sale_id: true,
            date: true,
            payment_type: true,
            user_id: true,
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

    const statuses = await prisma.delivery_statuses.findMany({
      select: { status_name: true, sequence_order: true },
      orderBy: [{ sequence_order: "asc" }],
      take: 100,
    });

    const saleDate = delivery.sale?.date ?? delivery.date;

    const customer = delivery.sale?.user_id
      ? await prisma.user_employee.findUnique({
          where: { user_id: delivery.sale.user_id },
          select: { user_id: true, user_name: true },
        })
      : null;

    return NextResponse.json({
      data: {
        saleId: delivery.sale_id,
        deliveryId: delivery.delivery_id,
        date: saleDate ? new Date(saleDate).toISOString().slice(0, 10) : "",
        paymentType: delivery.sale?.payment_type ?? "",
        status: delivery.delivery_statuses?.status_name ?? "Pending",
        trackingNumber: delivery.tracking_number ?? null,
        courier: delivery.courier ? { id: delivery.courier.courier_id, name: delivery.courier.name } : null,
        address: delivery.address
          ? { id: delivery.address.address_id, text: buildAddressText(delivery.address) }
          : null,
        customer: customer ? { id: customer.user_id, name: customer.user_name } : null,
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
        statusOptions: statuses,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load admin order" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ saleId: string }> },
) {
  try {
    const rawParams = await context.params;
    const parsedParams = paramsSchema.safeParse({ saleId: rawParams.saleId });
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid saleId" }, { status: 400 });
    }

    const body = await request.json();
    const parsedBody = patchSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await ensureDefaultStatuses();

    const saleId = parsedParams.data.saleId;
    const { statusName, trackingNumber, actorUserId, locationDetails } = parsedBody.data;

    const delivery = await prisma.delivery.findFirst({
      where: { sale_id: saleId },
      select: { delivery_id: true, status_id: true, tracking_number: true },
    });

    if (!delivery) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let nextStatusId: number | null = null;

    if (statusName) {
      const status = await prisma.delivery_statuses.findUnique({
        where: { status_name: statusName },
        select: { status_id: true },
      });
      if (!status) {
        return NextResponse.json({ error: "Unknown status" }, { status: 400 });
      }
      nextStatusId = status.status_id;

      if (statusName === "Tracking number posted") {
        const t = (trackingNumber ?? delivery.tracking_number ?? "").trim();
        if (!t) {
          return NextResponse.json(
            { error: "Tracking number is required for 'Tracking number posted'" },
            { status: 400 },
          );
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedDelivery = await tx.delivery.update({
        where: { delivery_id: delivery.delivery_id },
        data: {
          ...(typeof trackingNumber === "string" ? { tracking_number: trackingNumber.trim() || null } : {}),
          ...(nextStatusId ? { status_id: nextStatusId } : {}),
        },
        select: {
          delivery_id: true,
          sale_id: true,
          tracking_number: true,
          delivery_statuses: { select: { status_name: true } },
        },
      });

      if (nextStatusId) {
        await tx.delivery_history.create({
          data: {
            delivery_id: delivery.delivery_id,
            status_id: nextStatusId,
            user_id: actorUserId ?? null,
            location_details: locationDetails ?? null,
          },
          select: { history_id: true },
        });
      }

      return updatedDelivery;
    });

    return NextResponse.json({
      data: {
        deliveryId: updated.delivery_id,
        saleId: updated.sale_id,
        status: updated.delivery_statuses?.status_name ?? null,
        trackingNumber: updated.tracking_number ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
