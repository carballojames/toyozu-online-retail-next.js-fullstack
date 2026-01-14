import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const userIdSchema = z.coerce.number().int().positive();

const createAddressSchema = z
  .object({
    userId: userIdSchema,
    isDefault: z.coerce.boolean().optional(),
  })
  .and(
    z.union([
      z.object({ approvedAddressId: z.coerce.number().int().positive() }),
      z.object({ street: z.string().trim().min(3).max(255) }),
    ])
  );

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = userIdSchema.safeParse(url.searchParams.get("userId"));

    if (!parsed.success) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = createAddressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { userId, isDefault } = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { user_id: userId },
          data: { is_default: false },
        });
      }

      if ("approvedAddressId" in parsed.data) {
        const approved = await tx.approved_address.findUnique({
          where: { approved_address_id: parsed.data.approvedAddressId },
          select: {
            approved_address_id: true,
            barangay_id: true,
            street_house_building_no: true,
            is_active: true,
          },
        });

        if (!approved || !approved.is_active) {
          throw new Error("Selected address is not available.");
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
      }

      return tx.address.create({
        data: {
          user_id: userId,
          street_house_building_no: parsed.data.street,
          approved_address_id: null,
          barangay_id: null,
          is_default: isDefault ?? false,
        },
      });
    });

    return NextResponse.json({
      data: {
        id: created.address_id,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create address";
    if (message === "Selected address is not available.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create address" }, { status: 500 });
  }
}
