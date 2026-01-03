"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { AdminProduct } from "../admin-dashboard.types";

type SupplierReceiptLine = {
  id: string;
  name: string;
  brand: string;
  category: string;
  condition: string;
  purchasePrice: string;
  sellingPrice: string;
  quantity: string;
};

type SupplierReceiptMeta = {
  receiptNumber: string;
  supplier: string;
  date: string;
};

const SUPPLIER_PLACEHOLDER = "Select Supplier";
const BRAND_PLACEHOLDER = "Select Brand";
const CATEGORY_PLACEHOLDER = "Select Category";
const CONDITION_PLACEHOLDER = "Select Condition";

type LookupsResponse = {
  data?: {
    suppliers: string[];
    brands: string[];
    categories: string[];
    conditions: string[];
  };
};

type SupplyReceiptResponse = {
  data?: {
    supplyId: number;
    products: Array<{
      product_id: number;
      name: string;
      selling_price: number | null;
      quantity: number | null;
      brand: { name: string } | null;
      category: { name: string } | null;
    }>;
  };
  error?: string;
};

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function newReceiptNumber(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `RCP-${rand}`;
}

function newLine(): SupplierReceiptLine {
  return {
    id: crypto?.randomUUID?.() ?? `line-${Date.now()}-${Math.random()}`,
    name: "",
    brand: BRAND_PLACEHOLDER,
    category: CATEGORY_PLACEHOLDER,
    condition: CONDITION_PLACEHOLDER,
    purchasePrice: "",
    sellingPrice: "",
    quantity: "",
  };
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function AddProductModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (products: AdminProduct[], meta: SupplierReceiptMeta) => void;
}) {
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [supplier, setSupplier] = useState<string>(SUPPLIER_PLACEHOLDER);
  const [date, setDate] = useState<string>(todayIso());
  const [lines, setLines] = useState<SupplierReceiptLine[]>([newLine()]);
  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [suppliers, setSuppliers] = useState<string[]>([SUPPLIER_PLACEHOLDER]);
  const [brands, setBrands] = useState<string[]>([BRAND_PLACEHOLDER]);
  const [categories, setCategories] = useState<string[]>([CATEGORY_PLACEHOLDER]);
  const [conditions, setConditions] = useState<string[]>([CONDITION_PLACEHOLDER]);

  const fetchLookups = async (signal?: AbortSignal): Promise<void> => {
    const res = await fetch("/api/admin/lookups", {
      method: "GET",
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return;

    const json = (await res.json()) as LookupsResponse;
    const data = json.data;
    if (!data) return;

    const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

    setSuppliers([SUPPLIER_PLACEHOLDER, ...uniq(data.suppliers)]);
    setBrands([BRAND_PLACEHOLDER, ...uniq(data.brands)]);
    setCategories([CATEGORY_PLACEHOLDER, ...uniq(data.categories)]);
    setConditions([CONDITION_PLACEHOLDER, ...uniq(data.conditions)]);
  };

  const createLookup = async (
    type: "supplier" | "brand" | "category" | "condition",
    name: string,
  ): Promise<string> => {
    const res = await fetch("/api/admin/lookups", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ type, name }),
    });

    const json = (await res.json()) as { data?: { name: string }; error?: string };

    if (!res.ok) {
      throw new Error(json.error || `Failed to create ${type}`);
    }

    if (!json.data?.name) {
      throw new Error(`Failed to create ${type}`);
    }

    return json.data.name;
  };

  const addSupplier = async (): Promise<void> => {
    const raw = window.prompt("Add supplier name");
    const value = raw?.trim();
    if (!value) return;

    try {
      const createdName = await createLookup("supplier", value);
      setSuppliers((prev) => (prev.includes(createdName) ? prev : [...prev, createdName]));
      setSupplier(createdName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add supplier");
    }
  };

  const addBrand = async (): Promise<void> => {
    const raw = window.prompt("Add brand name");
    const value = raw?.trim();
    if (!value) return;

    try {
      const createdName = await createLookup("brand", value);
      setBrands((prev) => (prev.includes(createdName) ? prev : [...prev, createdName]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add brand");
    }
  };

  const addCategory = async (): Promise<void> => {
    const raw = window.prompt("Add category name");
    const value = raw?.trim();
    if (!value) return;

    try {
      const createdName = await createLookup("category", value);
      setCategories((prev) => (prev.includes(createdName) ? prev : [...prev, createdName]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add category");
    }
  };

  useEffect(() => {
    if (!open) return;
    setError("");
    setReceiptNumber(newReceiptNumber());
    setSupplier(SUPPLIER_PLACEHOLDER);
    setDate(todayIso());
    setLines([newLine()]);

    const controller = new AbortController();
    void fetchLookups(controller.signal);
    return () => controller.abort();
  }, [open]);

  const total = useMemo(() => {
    return lines.reduce((sum, l) => sum + toNumber(l.purchasePrice) * Math.max(0, toNumber(l.quantity)), 0);
  }, [lines]);

  const updateLine = (id: string, patch: Partial<SupplierReceiptLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  };

  const addLine = () => setLines((prev) => [...prev, newLine()]);

  const handleConfirm = async (): Promise<void> => {
    const usable = lines.filter((l) => l.name.trim().length > 0);
    if (usable.length === 0) {
      setError("Add at least one product name.");
      return;
    }

    if (supplier === SUPPLIER_PLACEHOLDER) {
      setError("Please select a Supplier.");
      return;
    }

    for (const l of usable) {
      if (l.brand === BRAND_PLACEHOLDER || l.category === CATEGORY_PLACEHOLDER) {
        setError("Please select Brand and Category for each product.");
        return;
      }
      if (toNumber(l.sellingPrice) <= 0 || toNumber(l.quantity) <= 0) {
        setError("Selling price and quantity must be greater than 0.");
        return;
      }
    }

    try {
      setIsSaving(true);
      setError("");

      const res = await fetch("/api/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          receiptNumber,
          supplier,
          date,
          lines: usable,
        }),
      });

      const json = (await res.json()) as SupplyReceiptResponse;
      if (!res.ok) {
        throw new Error(json.error || "Failed to create receipt");
      }

      const createdProducts = json.data?.products ?? [];
      const products: AdminProduct[] = createdProducts.map((p) => ({
        id: String(p.product_id),
        name: p.name,
        brand: p.brand?.name ?? "",
        category: p.category?.name ?? "",
        price: Number(p.selling_price ?? 0),
        stock: Number(p.quantity ?? 0),
      }));

      onConfirm(products, { receiptNumber, supplier, date });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm receipt");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[1750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplier Receipt</DialogTitle>
          <DialogDescription>Product inventory form</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Receipt Number</div>
            <Input value={receiptNumber} readOnly />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Supplier</div>
            <div className="flex gap-2">
              <Select value={supplier} onValueChange={setSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addSupplier} disabled={isSaving}>
                + Supplier
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Date</div>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm font-semibold text-foreground">Product Details</div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={addBrand} disabled={isSaving}>
              + Brand
            </Button>
            <Button type="button" variant="outline" onClick={addCategory} disabled={isSaving}>
              + Category
            </Button>
            <Button type="button" variant="outline" onClick={addLine} disabled={isSaving}>
              + Add Product Line
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-lg">
          <div className="px-2 py-2">
            <div className="grid grid-cols-[500px_80px_1fr_1fr_1fr_112px_112px_64px_120px_40px] gap-3 px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground items-center">
              <div className="min-w-0">Product Name</div>
              <div className="text-start">Photo</div>
              <div className="text-start ">Brand</div>
              <div className="text-start ">Category</div>
              <div className="text-start ">Condition</div>
              <div className="text-start">Purchase</div>
              <div className="text-start">Selling</div>
              <div className="text-start">Qty</div>
              <div className="text-center">Subtotal</div>
              <div />
            </div>

            {lines.map((l) => {
              const subTotal = toNumber(l.purchasePrice) * Math.max(0, toNumber(l.quantity));
              return (
                <div key={l.id} className="grid grid-cols-[500px_80px_1fr_1fr_1fr_112px_112px_64px_120px_40px] gap-3 px-4 py-3 border-b border-border items-center">
                  <div className="min-w-0">
                    <Input
                      placeholder="Product name"
                      value={l.name}
                      onChange={(e) => updateLine(l.id, { name: e.target.value })}
                      className="min-w-0 flex items-start"
                    />
                  </div>

                  <div className="text-start">
                    <Input type="file" className="w-20 text-sm " />
                  </div>

                  <div className="">
                    <Select value={l.brand} onValueChange={(v) => updateLine(l.id, { brand: v })}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select Brand" />
                      </SelectTrigger>
                      <SelectContent position="popper" portal={false}>
                        {brands.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="">
                    <Select value={l.category} onValueChange={(v) => updateLine(l.id, { category: v })}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent position="popper" portal={false}>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="">
                    <Select value={l.condition} onValueChange={(v) => updateLine(l.id, { condition: v })}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="Select Condition" />
                      </SelectTrigger>
                      <SelectContent position="popper" portal={false}>
                        {conditions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="">
                    <Input
                      inputMode="decimal"
                      placeholder="0.00"
                      value={l.purchasePrice}
                      onChange={(e) => updateLine(l.id, { purchasePrice: e.target.value })}
                      className="text-right text-sm w-24"
                    />
                  </div>

                  <div className="">
                    <Input
                      inputMode="decimal"
                      placeholder="0.00"
                      value={l.sellingPrice}
                      onChange={(e) => updateLine(l.id, { sellingPrice: e.target.value })}
                      className="text-right text-sm w-24"
                    />
                  </div>

                  <div className="">
                    <Input
                      inputMode="numeric"
                      placeholder="0"
                      value={l.quantity}
                      onChange={(e) => updateLine(l.id, { quantity: e.target.value })}
                      className="text-right text-sm w-16"
                    />
                  </div>

                  <div className="text-center text-sm text-muted-foreground">₱{subTotal.toFixed(2)}</div>

                  <div className="flex items-start justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(l.id)} aria-label="Remove">
                      ×
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <div className="flex items-center justify-end">
          <div className="text-sm font-semibold text-foreground">TOTAL:&nbsp;₱{total.toFixed(2)}</div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? "Saving…" : "Confirm Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
