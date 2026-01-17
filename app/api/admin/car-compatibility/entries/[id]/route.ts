import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const FITMENT_PLACEHOLDER_PRODUCT_NAME = "__FITMENT_ONLY__";

type Params = { id: string };

type Context = {
  params: Promise<Params>;
};

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const rowId = Number(id);

    if (!Number.isFinite(rowId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await prisma.product_car_compatibility.findFirst({
      where: {
        id: rowId,
        product: { name: FITMENT_PLACEHOLDER_PRODUCT_NAME },
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.product_car_compatibility.delete({ where: { id: rowId } });

    return NextResponse.json({ data: { deleted: true } });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete fitment" },
      { status: 500 }
    );
  }
}
