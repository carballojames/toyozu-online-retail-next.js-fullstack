import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { id: string; compatId: string };

type Context = {
  params: Promise<Params>;
};

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id, compatId } = await context.params;
    const productId = Number(id);
    const rowId = Number(compatId);

    if (!Number.isFinite(productId) || !Number.isFinite(rowId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await prisma.product_car_compatibility.findFirst({
      where: { id: rowId, product_id: productId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Compatibility not found" }, { status: 404 });
    }

    await prisma.product_car_compatibility.delete({ where: { id: rowId } });

    return NextResponse.json({ data: { deleted: true } });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete compatibility" },
      { status: 500 },
    );
  }
}
