import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const FITMENT_PLACEHOLDER_PRODUCT_NAME = "__FITMENT_ONLY__";

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildModelName(baseModel: string, variant: string): string {
  const base = normalizeName(baseModel);
  const v = normalizeName(variant);
  if (!base) return "";
  if (!v) return base;
  return `${base} - ${v}`;
}

async function getFitmentPlaceholderProductId(): Promise<number> {
  const existing = await prisma.product.findFirst({
    where: { name: FITMENT_PLACEHOLDER_PRODUCT_NAME },
    select: { product_id: true },
  });

  if (existing) return existing.product_id;

  const created = await prisma.product.create({
    data: {
      name: FITMENT_PLACEHOLDER_PRODUCT_NAME,
      description: "Internal placeholder for vehicle fitments (not a real product).",
      quantity: 0,
      selling_price: 0,
      purchase_price: 0,
      weight: 0,
    },
    select: { product_id: true },
  });

  return created.product_id;
}

export async function GET() {
  try {
    const fitmentProductId = await getFitmentPlaceholderProductId();

    const rows = await prisma.product_car_compatibility.findMany({
      where: { product_id: fitmentProductId },
      select: {
        id: true,
        product_id: true,
        model_id: true,
        start_year_id: true,
        end_year_id: true,
        car_models: {
          select: {
            model_name: true,
            cars: { select: { make: true, car_id: true } },
          },
        },
        product_years_product_car_compatibility_start_year_idToproduct_years: {
          select: { year: true },
        },
        product_years_product_car_compatibility_end_year_idToproduct_years: {
          select: { year: true },
        },
      },
      orderBy: [{ id: "desc" }],
      take: 2000,
    });

    const data = rows.map((r) => {
      const modelName = r.car_models?.model_name ?? "";
      const [base, ...rest] = modelName.split("-").map((s) => s.trim());
      const variant = rest.join(" - ").trim();

      return {
        id: r.id,
        product_id: r.product_id,
        car_id: r.car_models?.cars?.car_id ?? null,
        make: r.car_models?.cars?.make ?? "",
        model_id: r.model_id,
        model_name: modelName,
        base_model: base ?? "",
        variant: variant || "",
        start_year_id: r.start_year_id,
        end_year_id: r.end_year_id,
        start_year:
          r.product_years_product_car_compatibility_start_year_idToproduct_years?.year ??
          null,
        end_year:
          r.product_years_product_car_compatibility_end_year_idToproduct_years?.year ??
          null,
      };
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch compatibility entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      make?: string;
      baseModel?: string;
      variant?: string;
      startYear?: number;
      endYear?: number;
    };

    const make = normalizeName(body.make ?? "");
    const baseModel = normalizeName(body.baseModel ?? "");
    const variant = normalizeName(body.variant ?? "");
    const startYear = Number(body.startYear);
    const endYear = Number(body.endYear);

    if (!make || !baseModel) {
      return NextResponse.json(
        { error: "make and baseModel are required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
      return NextResponse.json(
        { error: "startYear and endYear are required" },
        { status: 400 }
      );
    }

    if (startYear > endYear) {
      return NextResponse.json(
        { error: "startYear must be <= endYear" },
        { status: 400 }
      );
    }

    const modelName = buildModelName(baseModel, variant);
    if (!modelName) {
      return NextResponse.json(
        { error: "baseModel is required" },
        { status: 400 }
      );
    }

    const fitmentProductId = await getFitmentPlaceholderProductId();

    const car = await prisma.cars.upsert({
      where: { make },
      create: { make },
      update: {},
      select: { car_id: true, make: true },
    });

    const model = await prisma.car_models.upsert({
      where: {
        car_id_model_name: {
          car_id: car.car_id,
          model_name: modelName,
        },
      },
      create: {
        car_id: car.car_id,
        model_name: modelName,
      },
      update: {},
      select: { model_id: true, model_name: true, car_id: true },
    });

    const start = await prisma.product_years.upsert({
      where: { year: startYear },
      create: { year: startYear },
      update: {},
      select: { year_id: true },
    });

    const end = await prisma.product_years.upsert({
      where: { year: endYear },
      create: { year: endYear },
      update: {},
      select: { year_id: true },
    });

    const existing = await prisma.product_car_compatibility.findFirst({
      where: {
        product_id: fitmentProductId,
        model_id: model.model_id,
        start_year_id: start.year_id,
        end_year_id: end.year_id,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ data: { id: existing.id, created: false } });
    }

    const created = await prisma.product_car_compatibility.create({
      data: {
        product_id: fitmentProductId,
        model_id: model.model_id,
        start_year_id: start.year_id,
        end_year_id: end.year_id,
      },
      select: { id: true },
    });

    return NextResponse.json(
      {
        data: {
          id: created.id,
          created: true,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create compatibility entry" },
      { status: 500 }
    );
  }
}
