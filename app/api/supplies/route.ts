import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ReceiptLineInput = {
  name?: string;
  brand?: string;
  category?: string;
  condition?: string;
  purchasePrice?: string;
  sellingPrice?: string;
  quantity?: string;
};

type ReceiptInput = {
  receiptNumber?: string;
  supplier?: string;
  date?: string;
  lines?: ReceiptLineInput[];
};

function toInt(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function getPrismaErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if (!("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isRetryableDatabaseError(error: unknown): boolean {
  return getPrismaErrorCode(error) === "P1017";
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReceiptInput;

    const receiptNumber = body.receiptNumber?.trim();
    const supplierName = body.supplier?.trim();
    const dateStr = body.date?.trim();
    const lines = Array.isArray(body.lines) ? body.lines : [];

    if (!receiptNumber) {
      return NextResponse.json(
        { error: "receiptNumber is required" },
        { status: 400 },
      );
    }

    if (!supplierName || supplierName === "Select Supplier") {
      return NextResponse.json({ error: "supplier is required" }, { status: 400 });
    }

    if (!dateStr) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const usable = lines
      .map((l) => {
        const name = l.name?.trim() ?? "";
        const brand = l.brand?.trim() ?? "";
        const category = l.category?.trim() ?? "";
        const condition = l.condition?.trim() ?? "";
        const purchasePrice = toInt(l.purchasePrice);
        const sellingPrice = toInt(l.sellingPrice);
        const quantity = toInt(l.quantity);

        return {
          name,
          brand,
          category,
          condition,
          purchasePrice,
          sellingPrice,
          quantity,
        };
      })
      .filter((l) => l.name.length > 0);

    if (usable.length === 0) {
      return NextResponse.json(
        { error: "Add at least one product line" },
        { status: 400 },
      );
    }

    for (const l of usable) {
      if (!l.brand || l.brand === "Select Brand") {
        return NextResponse.json(
          { error: "Brand is required for each product" },
          { status: 400 },
        );
      }
      if (!l.category || l.category === "Select Category") {
        return NextResponse.json(
          { error: "Category is required for each product" },
          { status: 400 },
        );
      }
      if (l.sellingPrice <= 0 || l.quantity <= 0) {
        return NextResponse.json(
          { error: "Selling price and quantity must be greater than 0" },
          { status: 400 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingSupply = await tx.supply.findFirst({
        where: { receipt_number: receiptNumber },
        select: { supply_id: true },
      });
      if (existingSupply) {
        throw new HttpError("Receipt number already exists", 409);
      }

      // Supplier
      const supplierExisting = await tx.supplier.findFirst({
        where: { name: supplierName },
      });
      const supplier =
        supplierExisting ?? (await tx.supplier.create({ data: { name: supplierName } }));

      // Ensure brand/category/condition rows exist, then upsert products
      const productIds: number[] = [];
      const supplyDetailsToCreate: Array<{
        product_id: number;
        quantity: number;
        price: number;
        sub_total: number;
        condition_id: number | null;
      }> = [];

      let totalCost = 0;

      for (const l of usable) {
        const brandExisting = await tx.brand.findFirst({ where: { name: l.brand } });
        const brand = brandExisting ?? (await tx.brand.create({ data: { name: l.brand } }));

        const categoryExisting = await tx.category.findFirst({ where: { name: l.category } });
        const category =
          categoryExisting ??
          (await tx.category.create({ data: { name: l.category } }));

        const conditionId =
          l.condition && l.condition !== "Select Condition"
            ? (
                await (async () => {
                  const existing = await tx.condition_item.findFirst({
                    where: { name: l.condition },
                  });
                  const row =
                    existing ??
                    (await tx.condition_item.create({ data: { name: l.condition } }));
                  return row.condition_id;
                })()
              )
            : null;

        const existingProduct = await tx.product.findFirst({
          where: {
            name: l.name,
            brand_id: brand.brand_id,
            category_id: category.category_id,
          },
        });

        const product =
          existingProduct ??
          (await tx.product.create({
            data: {
              name: l.name,
              brand: { connect: { brand_id: brand.brand_id } },
              category: { connect: { category_id: category.category_id } },
              purchase_price: l.purchasePrice > 0 ? l.purchasePrice : undefined,
              selling_price: l.sellingPrice,
              quantity: l.quantity,
            },
          }));

        if (existingProduct) {
          const nextQty = (existingProduct.quantity ?? 0) + l.quantity;
          await tx.product.update({
            where: { product_id: existingProduct.product_id },
            data: {
              quantity: nextQty,
              purchase_price: l.purchasePrice > 0 ? l.purchasePrice : undefined,
              selling_price: l.sellingPrice,
            },
          });
        }

        productIds.push(product.product_id);

        const subTotal = (l.purchasePrice > 0 ? l.purchasePrice : 0) * l.quantity;
        totalCost += subTotal;

        supplyDetailsToCreate.push({
          product_id: product.product_id,
          quantity: l.quantity,
          price: l.purchasePrice > 0 ? l.purchasePrice : 0,
          sub_total: subTotal,
          condition_id: conditionId,
        });
      }

      const supply = await tx.supply.create({
        data: {
          supplier: { connect: { supplier_id: supplier.supplier_id } },
          receipt_number: receiptNumber,
          date,
          total_cost: totalCost,
          supply_details: {
            create: supplyDetailsToCreate.map((d) => ({
              product: { connect: { product_id: d.product_id } },
              quantity: d.quantity,
              price: d.price,
              sub_total: d.sub_total,
              condition_item: d.condition_id
                ? { connect: { condition_id: d.condition_id } }
                : undefined,
            })),
          },
        },
        select: { supply_id: true },
      });

      const products = await tx.product.findMany({
        where: { product_id: { in: productIds } },
        select: {
          product_id: true,
          name: true,
          selling_price: true,
          quantity: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: { product_id: "desc" },
      });

      return { supply, products };
    });

    return NextResponse.json({
      data: {
        supplyId: result.supply.supply_id,
        products: result.products,
      },
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }

    // One retry for transient connection drops
    if (isRetryableDatabaseError(e)) {
      try {
        await delay(250);
        // Re-run request is not possible here because the body stream is consumed.
        // Return a 503 so the client can retry.
        return NextResponse.json(
          { error: "Database connection was interrupted. Please retry." },
          { status: 503 },
        );
      } catch {
        // fall through
      }
    }

    const code = getPrismaErrorCode(e);
    console.error("/api/supplies POST failed", { code, error: e });

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV !== "production" && code
            ? `Failed to create supply receipt (${code})`
            : "Failed to create supply receipt",
      },
      { status: 500 },
    );
  }
}
