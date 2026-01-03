import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { id: string };

type Context = {
  params: Promise<Params>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const productId = Number(id);

    if (!Number.isFinite(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const rows = await prisma.product_car_compatibility.findMany({
      where: { product_id: productId },
      select: {
        id: true,
        model_id: true,
        start_year_id: true,
        end_year_id: true,
        car_models: {
          select: {
            model_name: true,
            cars: { select: { make: true } },
          },
        },
        product_years_product_car_compatibility_start_year_idToproduct_years: {
          select: { year: true },
        },
        product_years_product_car_compatibility_end_year_idToproduct_years: {
          select: { year: true },
        },
      },
      orderBy: [{ start_year_id: "asc" }, { end_year_id: "asc" }, { id: "asc" }],
    });

    const data = rows.map((r) => ({
      id: r.id,
      make: r.car_models?.cars?.make ?? "",
      model_name: r.car_models?.model_name ?? "",
      start_year_id: r.start_year_id,
      end_year_id: r.end_year_id,
      start_year: r.product_years_product_car_compatibility_start_year_idToproduct_years?.year ?? null,
      end_year: r.product_years_product_car_compatibility_end_year_idToproduct_years?.year ?? null,
      model_id: r.model_id,
    }));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch product compatibility" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const productId = Number(id);

    if (!Number.isFinite(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const body = (await request.json()) as {
      model_id?: number;
      start_year_id?: number;
      end_year_id?: number;
    };

    const modelId = Number(body.model_id);
    const startYearId = Number(body.start_year_id);
    const endYearId = Number(body.end_year_id);

    if (!Number.isFinite(modelId) || !Number.isFinite(startYearId) || !Number.isFinite(endYearId)) {
      return NextResponse.json(
        { error: "model_id, start_year_id, end_year_id are required" },
        { status: 400 },
      );
    }

    const exists = await prisma.product_car_compatibility.findFirst({
      where: {
        product_id: productId,
        model_id: modelId,
        start_year_id: startYearId,
        end_year_id: endYearId,
      },
      select: { id: true },
    });

    if (exists) {
      return NextResponse.json({ data: { id: exists.id, created: false } });
    }

    const created = await prisma.product_car_compatibility.create({
      data: {
        product_id: productId,
        model_id: modelId,
        start_year_id: startYearId,
        end_year_id: endYearId,
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: created.id, created: true } }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to add compatibility" },
      { status: 500 },
    );
  }
}
