import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const islandGroupSchema = z.enum(["Luzon", "Visayas", "Mindanao"]).optional();

function romanToInt(roman: string): number {
  const s = roman.toUpperCase();
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let total = 0;
  let prev = 0;
  for (let i = s.length - 1; i >= 0; i -= 1) {
    const v = map[s[i]] ?? 0;
    if (v < prev) total -= v;
    else total += v;
    prev = v;
  }
  return total;
}

function classifyIslandGroup(regionName: string): "Luzon" | "Visayas" | "Mindanao" | null {
  const name = regionName.toUpperCase();

  if (/(\bBARMM\b|\bARMM\b)/.test(name)) return "Mindanao";
  if (/(\bNCR\b|\bNATIONAL CAPITAL REGION\b|\bCAR\b|\bCORDILLERA\b)/.test(name)) return "Luzon";

  const match = name.match(/\bREGION\s*([IVXLCDM]+)\b/);
  if (!match) return null;

  const n = romanToInt(match[1]);
  if (n >= 1 && n <= 5) return "Luzon";
  if (n >= 6 && n <= 8) return "Visayas";
  if (n >= 9 && n <= 13) return "Mindanao";
  return null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const islandGroupParsed = islandGroupSchema.safeParse(url.searchParams.get("islandGroup") ?? undefined);
    const islandGroup = islandGroupParsed.success ? islandGroupParsed.data : undefined;

    const regions = await prisma.region.findMany({
      select: { region_id: true, name: true },
      orderBy: { name: "asc" },
    });

    const filtered = islandGroup
      ? regions.filter((r) => classifyIslandGroup(r.name) === islandGroup)
      : regions;

    return NextResponse.json(
      { data: filtered.map((r) => ({ id: r.region_id, name: r.name })) },
      { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=1800" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to load regions" }, { status: 500 });
  }
}
