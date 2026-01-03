import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type LookupType = "supplier" | "brand" | "category" | "condition";

export async function GET() {
  try {
    const [suppliers, brands, categories, conditions] = await Promise.all([
      prisma.supplier.findMany({
        select: { name: true },
        orderBy: { supplier_id: "asc" },
      }),
      prisma.brand.findMany({ select: { name: true }, orderBy: { brand_id: "asc" } }),
      prisma.category.findMany({
        select: { name: true },
        orderBy: { category_id: "asc" },
      }),
      prisma.condition_item.findMany({
        select: { name: true },
        orderBy: { condition_id: "asc" },
      }),
    ]);

    return NextResponse.json({
      data: {
        suppliers: suppliers.map((s) => s.name),
        brands: brands.map((b) => b.name),
        categories: categories.map((c) => c.name),
        conditions: conditions.map((c) => c.name),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch lookups" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: LookupType;
      name?: string;
    };

    const type = body.type;
    const name = body.name?.trim();

    if (!type || !name) {
      return NextResponse.json(
        { error: "type and name are required" },
        { status: 400 },
      );
    }

    if (!/^[\p{L}\p{N} .,'&\-()\/]+$/u.test(name)) {
      return NextResponse.json(
        { error: "Invalid name" },
        { status: 400 },
      );
    }

    if (type === "supplier") {
      const existing = await prisma.supplier.findFirst({ where: { name } });
      if (existing) return NextResponse.json({ data: { name: existing.name } });
      const created = await prisma.supplier.create({ data: { name } });
      return NextResponse.json({ data: { name: created.name } }, { status: 201 });
    }

    if (type === "brand") {
      const existing = await prisma.brand.findFirst({ where: { name } });
      if (existing) return NextResponse.json({ data: { name: existing.name } });
      const created = await prisma.brand.create({ data: { name } });
      return NextResponse.json({ data: { name: created.name } }, { status: 201 });
    }

    if (type === "category") {
      const existing = await prisma.category.findFirst({ where: { name } });
      if (existing) return NextResponse.json({ data: { name: existing.name } });
      const created = await prisma.category.create({ data: { name } });
      return NextResponse.json({ data: { name: created.name } }, { status: 201 });
    }

    if (type === "condition") {
      const existing = await prisma.condition_item.findFirst({ where: { name } });
      if (existing) return NextResponse.json({ data: { name: existing.name } });
      const created = await prisma.condition_item.create({ data: { name } });
      return NextResponse.json({ data: { name: created.name } }, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create lookup" },
      { status: 500 },
    );
  }
}
