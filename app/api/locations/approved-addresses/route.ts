import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const barangayIdSchema = z.coerce.number().int().positive();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = barangayIdSchema.safeParse(url.searchParams.get("barangayId"));

    if (!parsed.success) {
      return NextResponse.json({ error: "barangayId is required" }, { status: 400 });
    }

    const barangayId = parsed.data;

    const rows = await prisma.approved_address.findMany({
      where: { barangay_id: barangayId, is_active: true },
      select: { approved_address_id: true, street_house_building_no: true },
      orderBy: { street_house_building_no: "asc" },
    });

    return NextResponse.json({
      data: rows.map((r) => ({ id: r.approved_address_id, label: r.street_house_building_no })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load approved addresses" }, { status: 500 });
  }
}
