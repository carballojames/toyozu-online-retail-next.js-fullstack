import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const make = url.searchParams.get("make")?.trim() || "";

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

    let models: Array<{ model_id: number; model_name: string; car_id: number }> = [];

    if (make) {
      const car = await prisma.cars.findFirst({
        where: { make },
        select: { car_id: true },
      });

      if (car) {
        models = await prisma.car_models.findMany({
          where: { car_id: car.car_id },
          select: { model_id: true, model_name: true, car_id: true },
          orderBy: { model_name: "asc" },
        });
      }
    }

    return NextResponse.json({
      data: {
        makes: cars.map((c) => c.make),
        years,
        models,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch car compatibility lookups" },
      { status: 500 },
    );
  }
}
