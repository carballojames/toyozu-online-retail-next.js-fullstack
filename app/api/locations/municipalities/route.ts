import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const regionIdSchema = z.coerce.number().int().positive();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = regionIdSchema.safeParse(url.searchParams.get("regionId"));

    if (!parsed.success) {
      return NextResponse.json({ error: "regionId is required" }, { status: 400 });
    }

    const regionId = parsed.data;

    const municipalities = await prisma.municipality.findMany({
      where: {
        province: {
          region_id: regionId,
        },
      },
      select: {
        municipality_id: true,
        name: true,
        postal_code: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      {
        data: municipalities.map((m) => ({
          id: m.municipality_id,
          name: m.name,
          postal_code: m.postal_code,
        })),
      },
      { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1800" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to load municipalities" }, { status: 500 });
  }
}
