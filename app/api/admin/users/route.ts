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
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "10", 10) || 10));
    const skip = (page - 1) * pageSize;

    const where = q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" as const } },
            { user_name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const [users, total] = await prisma.$transaction([
      prisma.user_employee.findMany({
        where,
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
        skip,
        take: pageSize,
      }),
      prisma.user_employee.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      data: users,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
