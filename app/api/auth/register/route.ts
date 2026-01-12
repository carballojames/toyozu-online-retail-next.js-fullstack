import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  user_name: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email().optional(),
  mobile_phone: z.string().min(1).optional(),
  password: z.string().min(8),
});

async function resolveDefaultRoleId(): Promise<number> {
  const explicit = Number(process.env.DEFAULT_CUSTOMER_ROLE_ID);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const customer = await prisma.role_type.findFirst({
    where: {
      title: {
        contains: "customer",
        mode: "insensitive",
      },
    },
    select: { role_id: true },
  });

  if (customer?.role_id) return customer.role_id;

  const first = await prisma.role_type.findFirst({
    orderBy: { role_id: "asc" },
    select: { role_id: true },
  });

  if (!first) {
    throw new Error("No roles exist in role_type (cannot assign role_id)");
  }

  return first.role_id;
}

export async function POST(request: Request) {
  try {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid registration details" }, { status: 400 });
    }

    const { user_name, username, email, mobile_phone, password } = parsed.data;

    const existing = await prisma.user_employee.findUnique({
      where: { username },
      select: { user_id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const roleId = await resolveDefaultRoleId();

    // IMPORTANT: Hash password on the server only.
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user_employee.create({
      data: {
        user_name,
        username,
        password: passwordHash,
        email: email ?? null,
        mobile_phone: mobile_phone ?? null,
        role_id: roleId,
        is_superuser: false,
      },
      select: {
        user_id: true,
        username: true,
        user_name: true,
        role_id: true,
        is_superuser: true,
      },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err) {
    console.error("/api/auth/register failed", err);
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Registration failed"
            : `Registration failed: ${message}`,
      },
      { status: 500 }
    );
  }
}
