import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

function isLocalDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function databaseNotConfiguredResponse() {
  return NextResponse.json(
    {
      error:
        "Database is not configured for deployment. Set DATABASE_URL to a hosted Postgres URL (not localhost).",
    },
    { status: 503 },
  );
}

const searchSchema = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((v) => (v ? v : undefined));

export async function GET(request: Request) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || (process.env.VERCEL && isLocalDatabaseUrl(databaseUrl))) {
      return databaseNotConfiguredResponse();
    }

    const url = new URL(request.url);
    const q = searchSchema.parse(url.searchParams.get("q") ?? undefined);

    const users = await prisma.user_employee.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { user_name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: {
        user_id: true,
        user_name: true,
        username: true,
        email: true,
        mobile_phone: true,
        role_id: true,
        is_superuser: true,
        contact_type: true,
        last_login: true,
      },
      orderBy: { user_id: "desc" },
      take: 200,
    });

    return NextResponse.json({ data: users });
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
