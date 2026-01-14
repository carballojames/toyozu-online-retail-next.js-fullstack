import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const userIdSchema = z.coerce.number().int().positive();

const createSchema = z.object({
  approvedAddressId: z.coerce.number().int().positive(),
  isDefault: z.coerce.boolean().optional(),
});

export async function GET(_request: Request, ctx: { params: Promise<{ userId: string }> }) {
  try {
    const params = await ctx.params;
    const parsed = userIdSchema.safeParse(params.userId);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const userId = parsed.data;

    const addresses = await prisma.address.findMany({
      where: { user_id: userId },
      orderBy: [{ is_default: "desc" }, { address_id: "desc" }],
      include: {
        approved_address: true,
        barangay: {
          include: {
            municipality: {
              include: {
                province: {
                  include: {
                    region: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      data: addresses.map((a) => ({
        id: a.address_id,
        street: a.street_house_building_no,
        approved_address: a.approved_address
          ? {
              id: a.approved_address.approved_address_id,
              label: a.approved_address.street_house_building_no,
            }
          : null,
        is_default: a.is_default ?? false,
        barangay: a.barangay
          ? {
              id: a.barangay.barangay_id,
              name: a.barangay.name,
              municipality: a.barangay.municipality
                ? {
                    id: a.barangay.municipality.municipality_id,
                    name: a.barangay.municipality.name,
                    province: a.barangay.municipality.province
                      ? {
                          id: a.barangay.municipality.province.province_id,
                          name: a.barangay.municipality.province.name,
                          region: a.barangay.municipality.province.region
                            ? {
                                id: a.barangay.municipality.province.region.region_id,
                                name: a.barangay.municipality.province.region.name,
                              }
                            : null,
                        }
                      : null,
                  }
                : null,
            }
          : null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load addresses" }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ userId: string }> }) {
  try {
    const params = await ctx.params;
    const parsed = userIdSchema.safeParse(params.userId);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const userId = parsed.data;

    const body = (await request.json()) as unknown;
    const bodyParsed = createSchema.safeParse(body);

    if (!bodyParsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { approvedAddressId, isDefault } = bodyParsed.data;

    const approved = await prisma.approved_address.findUnique({
      where: { approved_address_id: approvedAddressId },
      select: {
        approved_address_id: true,
        barangay_id: true,
        street_house_building_no: true,
        is_active: true,
      },
    });

    if (!approved || !approved.is_active) {
      return NextResponse.json({ error: "Selected address is not available." }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({ where: { user_id: userId }, data: { is_default: false } });
      }

      return tx.address.create({
        data: {
          user_id: userId,
          barangay_id: approved.barangay_id,
          approved_address_id: approved.approved_address_id,
          street_house_building_no: approved.street_house_building_no,
          is_default: isDefault ?? false,
        },
      });
    });

    return NextResponse.json({ data: { id: created.address_id } });
  } catch {
    return NextResponse.json({ error: "Failed to create address" }, { status: 500 });
  }
}
