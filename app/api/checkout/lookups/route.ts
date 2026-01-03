import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const userIdSchema = z.coerce.number().int().positive();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = userIdSchema.safeParse(url.searchParams.get("userId"));

    const couriers = await prisma.courier.findMany({
      select: {
        courier_id: true,
        name: true,
        base_rate: true,
        rate_per_kg: true,
        max_weight: true,
        delivery_time: true,
      },
      orderBy: { courier_id: "asc" },
      take: 100,
    });

    const addresses = parsed.success
      ? await prisma.address.findMany({
          where: { user_id: parsed.data },
          select: {
            address_id: true,
            street_house_building_no: true,
            barangay: {
              select: {
                name: true,
                municipality: { select: { name: true, province: { select: { name: true } } } },
              },
            },
          },
          orderBy: { address_id: "asc" },
          take: 50,
        })
      : [];

    const mappedAddresses = addresses.map((a) => {
      const parts = [
        a.street_house_building_no,
        a.barangay?.name,
        a.barangay?.municipality?.name,
        a.barangay?.municipality?.province?.name,
      ].filter((x): x is string => Boolean(x && x.trim()));

      return {
        id: String(a.address_id),
        label: parts[0] ?? `Address #${a.address_id}`,
        lines: parts.length > 0 ? parts : [`Address #${a.address_id}`],
      };
    });

    const mappedCouriers = couriers.map((c) => ({
      id: String(c.courier_id),
      name: c.name,
      eta: c.delivery_time ?? "",
      base_rate: Number(c.base_rate ?? 0),
      rate_per_kg: Number(c.rate_per_kg ?? 0),
      max_weight: c.max_weight !== null && c.max_weight !== undefined ? Number(c.max_weight) : null,
    }));

    return NextResponse.json({
      data: {
        couriers: mappedCouriers,
        addresses: mappedAddresses,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load checkout lookups" }, { status: 500 });
  }
}
