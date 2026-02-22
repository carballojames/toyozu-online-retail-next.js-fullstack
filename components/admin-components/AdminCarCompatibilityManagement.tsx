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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ProductOption = { id: number; name: string };

type LookupCar = { car_id: number; make: string };

type CompatibilityRow = {
  id: number;
  make: string;
  model_name: string;
  start_year: number | null;
  end_year: number | null;
};

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function parseYear(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 1900 || parsed > 2100) return null;
  return parsed;
}

export default function CarCompatibilityPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [rows, setRows] = useState<CompatibilityRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [loadingRows, setLoadingRows] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [cars, setCars] = useState<LookupCar[]>([]);
  const [loadingLookups, setLoadingLookups] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>("");

  const [brandMake, setBrandMake] = useState<string>("");
  const [modelCarId, setModelCarId] = useState<string>("");
  const [modelBaseModel, setModelBaseModel] = useState<string>("");
  const [modelVariant, setModelVariant] = useState<string>("");

  const [variantCarId, setVariantCarId] = useState<string>("");
  const [variantBaseModel, setVariantBaseModel] = useState<string>("");
  const [variantVariant, setVariantVariant] = useState<string>("");

  const [yearInput, setYearInput] = useState<string>("");
  const [savingCatalog, setSavingCatalog] = useState<boolean>(false);

  const loadLookups = async () => {
    setLoadingLookups(true);
    try {
      const res = await fetch("/api/admin/car-compatibility/lookups", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as {
        data?: { cars?: LookupCar[] };
        error?: string;
      };

      if (!res.ok || !json.data?.cars || !Array.isArray(json.data.cars)) {
        return;
      }

      setCars(json.data.cars);
      if (!modelCarId && json.data.cars.length > 0) setModelCarId(String(json.data.cars[0].car_id));
      if (!variantCarId && json.data.cars.length > 0)
        setVariantCarId(String(json.data.cars[0].car_id));
    } finally {
      setLoadingLookups(false);
    }
  };

  const postCatalog = async (payload: unknown) => {
    setSavingCatalog(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/car-compatibility/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Failed to save");
        return false;
      }
      setSuccess("Saved.");
      await loadLookups();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      return false;
    } finally {
      setSavingCatalog(false);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    setError("");
    try {
      const res = await fetch("/api/products", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as {
        data?: Array<{ product_id: number; name: string }>;
        error?: string;
      };

      if (!res.ok || !Array.isArray(json.data)) {
        setProducts([]);
        setError(json.error || "Failed to load products");
        return;
      }

      const mapped = json.data
        .filter((p) => Number.isFinite(p.product_id) && Boolean(p.name))
        .map((p) => ({ id: p.product_id, name: p.name }));

      mapped.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(mapped);

      if (!selectedProductId && mapped.length > 0) {
        setSelectedProductId(String(mapped[0].id));
      }
    } catch (e) {
      setProducts([]);
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadProductCompatibility = async (productId: string) => {
    const parsed = Number(productId);
    if (!Number.isFinite(parsed)) {
      setRows([]);
      return;
    }

    setLoadingRows(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(String(parsed))}/compatibility`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as {
        data?: CompatibilityRow[];
        error?: string;
      };

      if (!res.ok || !Array.isArray(json.data)) {
        setRows([]);
        setError(json.error || "Failed to load product compatibility");
        return;
      }

      setRows(
        json.data.map((r) => ({
          id: r.id,
          make: r.make ?? "",
          model_name: r.model_name ?? "",
          start_year: r.start_year ?? null,
          end_year: r.end_year ?? null,
        })),
      );
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Failed to load product compatibility");
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    void loadProducts();
    void loadLookups();
  }, []);

  useEffect(() => {
    if (!selectedProductId) {
      setRows([]);
      return;
    }
    void loadProductCompatibility(selectedProductId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  const sortedRows = useMemo(() => {
    const next = [...rows];
    next.sort((a, b) => a.make.localeCompare(b.make) || a.model_name.localeCompare(b.model_name));
    return next;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Product Compatibility</h2>
          <p className="text-sm text-muted-foreground">
            List the cars compatible with a selected product.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={savingCatalog}>
                Add Car Brand
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Car Brand</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <div className="text-sm font-medium">Make</div>
                <Input value={brandMake} onChange={(e) => setBrandMake(e.target.value)} placeholder="e.g. Toyota" />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => void postCatalog({ kind: "brand", make: normalizeName(brandMake) })}
                  disabled={savingCatalog || !normalizeName(brandMake)}
                >
                  {savingCatalog ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={savingCatalog || loadingLookups}>
                Add Car Model
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Car Model</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Brand</div>
                  <Select value={modelCarId} onValueChange={setModelCarId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingLookups ? "Loading…" : "Select brand"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cars.map((c) => (
                        <SelectItem key={c.car_id} value={String(c.car_id)}>
                          {c.make}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Base Model</div>
                  <Input value={modelBaseModel} onChange={(e) => setModelBaseModel(e.target.value)} placeholder="e.g. Hilux" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Variant (optional)</div>
                  <Input value={modelVariant} onChange={(e) => setModelVariant(e.target.value)} placeholder="e.g. GRS 4x4" />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    void postCatalog({
                      kind: "model",
                      car_id: Number(modelCarId),
                      baseModel: normalizeName(modelBaseModel),
                      variant: normalizeName(modelVariant) || undefined,
                    })
                  }
                  disabled={
                    savingCatalog ||
                    !Number.isFinite(Number(modelCarId)) ||
                    !normalizeName(modelBaseModel)
                  }
                >
                  {savingCatalog ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={savingCatalog || loadingLookups}>
                Add Car Variant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Car Variant</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Brand</div>
                  <Select value={variantCarId} onValueChange={setVariantCarId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingLookups ? "Loading…" : "Select brand"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cars.map((c) => (
                        <SelectItem key={c.car_id} value={String(c.car_id)}>
                          {c.make}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Base Model</div>
                  <Input value={variantBaseModel} onChange={(e) => setVariantBaseModel(e.target.value)} placeholder="e.g. Hilux" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Variant</div>
                  <Input value={variantVariant} onChange={(e) => setVariantVariant(e.target.value)} placeholder="e.g. GRS 4x4" />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    void postCatalog({
                      kind: "variant",
                      car_id: Number(variantCarId),
                      baseModel: normalizeName(variantBaseModel),
                      variant: normalizeName(variantVariant),
                    })
                  }
                  disabled={
                    savingCatalog ||
                    !Number.isFinite(Number(variantCarId)) ||
                    !normalizeName(variantBaseModel) ||
                    !normalizeName(variantVariant)
                  }
                >
                  {savingCatalog ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={savingCatalog}>
                Add Year
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Year</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <div className="text-sm font-medium">Year</div>
                <Input value={yearInput} onChange={(e) => setYearInput(e.target.value)} inputMode="numeric" placeholder="e.g. 2026" />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    const year = parseYear(yearInput);
                    if (year === null) {
                      setError("Year must be between 1900 and 2100");
                      return;
                    }
                    void postCatalog({ kind: "year", year });
                  }}
                  disabled={savingCatalog || parseYear(yearInput) === null}
                >
                  {savingCatalog ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => void loadProducts()} disabled={loadingProducts}>
            {loadingProducts ? "Refreshing…" : "Refresh Products"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-3">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="text-sm text-emerald-700 border border-emerald-700/30 bg-emerald-700/10 rounded-md p-3">
          {success}
        </div>
      ) : null}

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-medium text-foreground">Product</div>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="w-[360px]">
                <SelectValue placeholder={loadingProducts ? "Loading products…" : "Select product"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => selectedProductId && void loadProductCompatibility(selectedProductId)}
            disabled={!selectedProductId || loadingRows}
          >
            {loadingRows ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Make</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Years</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                    {loadingRows ? "Loading…" : "No compatibility rows."}
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((r) => (
                  <TableRow key={String(r.id)}>
                    <TableCell className="font-medium">{r.make || "—"}</TableCell>
                    <TableCell>{r.model_name || "—"}</TableCell>
                    <TableCell>
                      {(r.start_year ?? "?") + " - " + (r.end_year ?? "?")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-xs text-muted-foreground">
          Manage compatibility in Product Edit → Car Compatibility.
        </div>
      </div>
    </div>
  );
}
