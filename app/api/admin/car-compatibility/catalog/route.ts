import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildModelName(baseModel: string, variant: string | undefined): string {
  const base = normalizeName(baseModel);
  const v = normalizeName(variant ?? "");
  if (!base) return "";
  if (!v) return base;
  return `${base} - ${v}`;
}

type CatalogBody =
  | { kind: "brand"; make: string }
  | { kind: "year"; year: number }
  | { kind: "model"; car_id: number; baseModel: string; variant?: string }
  | { kind: "variant"; car_id: number; baseModel: string; variant: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CatalogBody>;
    const kind = body.kind;

    if (kind === "brand") {
      const make = normalizeName(String((body as { make?: string }).make ?? ""));
      if (!make) {
        return NextResponse.json({ error: "make is required" }, { status: 400 });
      }

      const car = await prisma.cars.upsert({
        where: { make },
        create: { make },
        update: {},
        select: { car_id: true, make: true },
      });

      return NextResponse.json({ data: { created: true, car } }, { status: 201 });
    }

    if (kind === "year") {
      const year = Number((body as { year?: number }).year);
      if (!Number.isFinite(year)) {
        return NextResponse.json({ error: "year is required" }, { status: 400 });
      }
      if (year < 1900 || year > 2100) {
        return NextResponse.json({ error: "year must be between 1900 and 2100" }, { status: 400 });
      }

      const row = await prisma.product_years.upsert({
        where: { year },
        create: { year },
        update: {},
        select: { year_id: true, year: true },
      });

      return NextResponse.json({ data: { created: true, year: row } }, { status: 201 });
    }

    if (kind === "model" || kind === "variant") {
      const carId = Number((body as { car_id?: number }).car_id);
      if (!Number.isFinite(carId)) {
        return NextResponse.json({ error: "car_id is required" }, { status: 400 });
      }

      const baseModel = normalizeName(String((body as { baseModel?: string }).baseModel ?? ""));
      if (!baseModel) {
        return NextResponse.json({ error: "baseModel is required" }, { status: 400 });
      }

      const variant = normalizeName(String((body as { variant?: string }).variant ?? ""));
      if (kind === "variant" && !variant) {
        return NextResponse.json({ error: "variant is required" }, { status: 400 });
      }

      const modelName = buildModelName(baseModel, variant || undefined);
      if (!modelName) {
        return NextResponse.json({ error: "Invalid modelName" }, { status: 400 });
      }

      const model = await prisma.car_models.upsert({
        where: {
          car_id_model_name: {
            car_id: carId,
            model_name: modelName,
          },
        },
        create: {
          car_id: carId,
          model_name: modelName,
        },
        update: {},
        select: { model_id: true, model_name: true, car_id: true },
      });

      return NextResponse.json({ data: { created: true, model } }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to update car catalog" }, { status: 500 });
  }
}
