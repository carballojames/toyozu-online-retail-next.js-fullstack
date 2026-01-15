import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const municipalityIdSchema = z.coerce.number().int().positive();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = municipalityIdSchema.safeParse(url.searchParams.get("municipalityId"));

    if (!parsed.success) {
      return NextResponse.json({ error: "municipalityId is required" }, { status: 400 });
    }

    const municipalityId = parsed.data;

    const barangays = await prisma.barangay.findMany({
      where: { municipality_id: municipalityId },
      select: { barangay_id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      { data: barangays.map((b) => ({ id: b.barangay_id, name: b.name })) },
      { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1800" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to load barangays" }, { status: 500 });
  }
}
