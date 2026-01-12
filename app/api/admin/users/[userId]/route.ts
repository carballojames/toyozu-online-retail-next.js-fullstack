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

const paramsSchema = z.object({
  userId: z.string().min(1),
});

const patchSchema = z
  .object({
    user_name: z.string().min(1).max(255).optional(),
    username: z.string().min(3).max(150).optional(),
    email: z.string().email().optional().nullable(),
    mobile_phone: z.string().max(20).optional().nullable(),
    contact_type: z.enum(["email", "phone"]).optional(),
    role_id: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    is_superuser: z.boolean().optional(),
    // password is intentionally NOT supported here.
  })
  .strict();

function parseUserId(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || (process.env.VERCEL && isLocalDatabaseUrl(databaseUrl))) {
      return databaseNotConfiguredResponse();
    }

    const rawParams = await context.params;
    const { userId } = paramsSchema.parse(rawParams);
    const id = parseUserId(userId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const user = await prisma.user_employee.findUnique({
      where: { user_id: id },
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
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || (process.env.VERCEL && isLocalDatabaseUrl(databaseUrl))) {
      return databaseNotConfiguredResponse();
    }

    const rawParams = await context.params;
    const { userId } = paramsSchema.parse(rawParams);
    const id = parseUserId(userId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const body = patchSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }

    const patch = body.data;

    // Never allow password changes from this endpoint.
    const { /* password */ ...safePatch } = patch as Record<string, unknown>;

    try {
      const updated = await prisma.user_employee.update({
        where: { user_id: id },
        data: safePatch as never,
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
      });

      return NextResponse.json({ data: updated });
    } catch (err) {
      // Prisma unique constraint errors often come through as known request errors,
      // but we avoid importing Prisma types here.
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Unique") || message.includes("unique") || message.includes("P2002")) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      throw err;
    }
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
