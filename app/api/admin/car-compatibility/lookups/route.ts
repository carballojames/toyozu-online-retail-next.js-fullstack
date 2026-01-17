import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const carIdRaw = url.searchParams.get("carId");
    const carId = carIdRaw ? Number(carIdRaw) : NaN;

    const [cars, years] = await Promise.all([
      prisma.cars.findMany({
        select: { car_id: true, make: true },
        orderBy: { make: "asc" },
      }),
      prisma.product_years.findMany({
        select: { year_id: true, year: true },
        orderBy: { year: "asc" },
      }),
    ]);

    const models = Number.isFinite(carId)
      ? await prisma.car_models.findMany({
          where: { car_id: carId },
          select: { model_id: true, model_name: true, car_id: true },
          orderBy: { model_name: "asc" },
        })
      : [];

    return NextResponse.json({
      data: {
        cars,
        models,
        years,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch car compatibility lookups" },
      { status: 500 }
    );
  }
}
