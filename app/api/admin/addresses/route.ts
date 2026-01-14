import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createSchema = z.object({
  barangayId: z.coerce.number().int().positive(),
  street: z.string().trim().min(1).max(255),
  isActive: z.coerce.boolean().optional(),
});

export async function GET() {
  try {
    const rows = await prisma.approved_address.findMany({
      orderBy: [{ is_active: "desc" }, { created_at: "desc" }],
      include: {
        barangay: {
          include: {
            municipality: {
              include: {
                province: { include: { region: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      data: rows.map((r) => ({
        id: r.approved_address_id,
        street: r.street_house_building_no,
        is_active: r.is_active,
        created_at: r.created_at,
        barangay: {
          id: r.barangay.barangay_id,
          name: r.barangay.name,
          municipality: r.barangay.municipality
            ? {
                id: r.barangay.municipality.municipality_id,
                name: r.barangay.municipality.name,
                province: r.barangay.municipality.province
                  ? {
                      id: r.barangay.municipality.province.province_id,
                      name: r.barangay.municipality.province.name,
                      region: r.barangay.municipality.province.region
                        ? {
                            id: r.barangay.municipality.province.region.region_id,
                            name: r.barangay.municipality.province.region.name,
                          }
                        : null,
                    }
                  : null,
              }
            : null,
        },
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load approved addresses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const created = await prisma.approved_address.create({
      data: {
        barangay_id: parsed.data.barangayId,
        street_house_building_no: parsed.data.street,
        is_active: parsed.data.isActive ?? true,
      },
      select: { approved_address_id: true },
    });

    return NextResponse.json({ data: { id: created.approved_address_id } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create approved address";
    // Handle uniqueness constraint in a user-friendly way
    if (msg.toLowerCase().includes("uq_approved_address") || msg.toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "That address already exists for the selected barangay." }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to create approved address" }, { status: 500 });
  }
}
