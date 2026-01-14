import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MIN_FEE_WEIGHT_KG = 0.1; // 100 grams
const MIN_FEE_MAX_WEIGHT_KG = 1; // up to 1kg is min fee

const placeSchema = z.object({
  userId: z.coerce.number().int().positive(),
  addressId: z.coerce.number().int().positive(),
  courierId: z.coerce.number().int().positive(),
  paymentType: z.string().trim().min(1).max(255).optional().default("CASH_ON_DELIVERY"),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive().max(999),
      }),
    )
    .min(1),
});

function calculateShippingFee(totalWeightKgRaw: number, courier: {
  base_rate: number;
  rate_per_kg: number;
  max_weight: number | null;
}): number {
  const totalWeightKg = Math.max(0, totalWeightKgRaw);
  const chargeableWeightKg = Math.max(MIN_FEE_WEIGHT_KG, totalWeightKg);

  if (courier.max_weight !== null && chargeableWeightKg > courier.max_weight) {
    return Number.POSITIVE_INFINITY;
  }

  const baseFee = Math.max(0, courier.base_rate);
  const perKg = Math.max(0, courier.rate_per_kg);

  if (chargeableWeightKg <= MIN_FEE_MAX_WEIGHT_KG) return baseFee;

  const extraKg = chargeableWeightKg - MIN_FEE_MAX_WEIGHT_KG;
  const extraUnits = Math.ceil(extraKg);
  return baseFee + extraUnits * perKg;
}

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

async function getStatusIdByName(statusName: string): Promise<number | null> {
  const row = await prisma.delivery_statuses.findUnique({
    where: { status_name: statusName },
    select: { status_id: true },
  });
  return row?.status_id ?? null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = placeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { userId, addressId, courierId, items, paymentType } = parsed.data;

    // Basic ownership validation
    const [user, address, courier] = await Promise.all([
      prisma.user_employee.findUnique({ where: { user_id: userId }, select: { user_id: true } }),
      prisma.address.findFirst({ where: { address_id: addressId, user_id: userId }, select: { address_id: true } }),
      prisma.courier.findUnique({
        where: { courier_id: courierId },
        select: { courier_id: true, base_rate: true, rate_per_kg: true, max_weight: true },
      }),
    ]);

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!address) return NextResponse.json({ error: "Address not found" }, { status: 404 });
    if (!courier) return NextResponse.json({ error: "Courier not found" }, { status: 404 });

    const itemMap = new Map<number, number>();
    for (const it of items) {
      itemMap.set(it.productId, (itemMap.get(it.productId) ?? 0) + it.quantity);
    }

    const productIds = Array.from(itemMap.keys());
    const products = await prisma.product.findMany({
      where: { product_id: { in: productIds } },
      select: { product_id: true, selling_price: true, weight: true },
      take: 1000,
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
    }

    const byId = new Map(products.map((p) => [p.product_id, p] as const));

    let subtotal = 0;
    let totalWeightKg = 0;

    const lineItems = productIds.map((pid) => {
      const qty = itemMap.get(pid) ?? 0;
      const p = byId.get(pid);
      const unitPrice = Number(p?.selling_price ?? 0);
      const weight = Number(p?.weight ?? 0);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error("Invalid product price");
      }

      const lineSubtotal = unitPrice * qty;
      subtotal += lineSubtotal;

      if (Number.isFinite(weight) && weight > 0) {
        totalWeightKg += weight * qty;
      }

      return {
        product_id: pid,
        quantity: qty,
        selling_price: unitPrice,
        sub_total: lineSubtotal,
      };
    });

    const shippingFee = calculateShippingFee(totalWeightKg, {
      base_rate: Number(courier.base_rate ?? 0),
      rate_per_kg: Number(courier.rate_per_kg ?? 0),
      max_weight: courier.max_weight !== null ? Number(courier.max_weight) : null,
    });

    if (!Number.isFinite(shippingFee)) {
      return NextResponse.json(
        { error: "Selected courier cannot deliver this cart weight" },
        { status: 400 },
      );
    }

    const deliveryFeeInt = Math.max(0, Math.round(shippingFee));
    const overallTotal = subtotal + deliveryFeeInt;

    // Ensure statuses exist and get initial status.
    await ensureDefaultStatuses();
    const pendingStatusId = await getStatusIdByName("Pending");

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          user_id: userId,
          total_amount: overallTotal,
          payment_type: paymentType,
          date: new Date(),
        },
        select: { sale_id: true },
      });

      await tx.sale_details.createMany({
        data: lineItems.map((li) => ({
          sale_id: sale.sale_id,
          product_id: li.product_id,
          quantity: li.quantity,
          selling_price: li.selling_price,
          sub_total: li.sub_total,
        })),
      });

      const delivery = await tx.delivery.create({
        data: {
          sale_id: sale.sale_id,
          courier_id: courierId,
          address_id: addressId,
          delivery_fee: deliveryFeeInt,
          overall_total: overallTotal,
          date: new Date(),
          status_id: pendingStatusId ?? undefined,
          tracking_number: null,
        },
        select: { delivery_id: true },
      });

      if (pendingStatusId) {
        await tx.delivery_history.create({
          data: {
            delivery_id: delivery.delivery_id,
            status_id: pendingStatusId,
            user_id: null,
            location_details: null,
          },
          select: { history_id: true },
        });
      }

      await tx.user_cart.deleteMany({
        where: {
          user_id: userId,
          product_id: { in: productIds },
        },
      });

      return { saleId: sale.sale_id, deliveryId: delivery.delivery_id };
    });

    return NextResponse.json(
      {
        data: {
          saleId: result.saleId,
          deliveryId: result.deliveryId,
          subtotal,
          deliveryFee: deliveryFeeInt,
          total: overallTotal,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to place order";
    return NextResponse.json({ error: msg || "Failed to place order" }, { status: 500 });
  }
}
