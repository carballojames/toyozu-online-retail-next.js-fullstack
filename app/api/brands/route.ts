import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isLocalDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || (process.env.VERCEL && isLocalDatabaseUrl(databaseUrl))) {
      return NextResponse.json(
        {
          error:
            "Database is not configured for deployment. Set DATABASE_URL to a hosted Postgres URL (not localhost).",
        },
        { status: 503 },
      );
    }

    const rows = await prisma.brand.findMany({
      select: {
        brand_id: true,
        name: true,
        _count: { select: { product: true } },
      },
      orderBy: { brand_id: "asc" },
      take: 500,
    });

    const brands = rows.map((b) => ({
      id: b.brand_id,
      name: b.name,
      productCount: b._count.product,
    }));

    return NextResponse.json(
      { data: { brands } },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch brands" }, { status: 500 });
  }
}
