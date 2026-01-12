"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { LookupsResponse, CarCompatibilityLookupResponse, ParsedCarModel, Props, ProductCompatibilityRow, ApiProduct} from "../../admin-dashboard.types";

const BRAND_PLACEHOLDER = "Select Brand";
const CATEGORY_PLACEHOLDER = "Select Category";


function toStringOrEmpty(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function EditProductModal({ open, productId, onOpenChange, onSaved }: Props) {
  const numericProductId = useMemo(() => {
    if (!productId) return NaN;
    const n = Number(productId);
    return Number.isFinite(n) ? n : NaN;
  }, [productId]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [error, setError] = useState<string>("");

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [sellingPrice, setSellingPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [brand, setBrand] = useState<string>(BRAND_PLACEHOLDER);
  const [category, setCategory] = useState<string>(CATEGORY_PLACEHOLDER);

  const [images, setImages] = useState<Array<{ id: number; url: string }>>([]);

  const [brands, setBrands] = useState<string[]>([BRAND_PLACEHOLDER]);
  const [categories, setCategories] = useState<string[]>([CATEGORY_PLACEHOLDER]);

  const [compatRows, setCompatRows] = useState<ProductCompatibilityRow[]>([]);
  const [carMakes, setCarMakes] = useState<string[]>([]);
  const [carYears, setCarYears] = useState<Array<{ year_id: number; year: number }>>([]);
  const [carModels, setCarModels] = useState<Array<{ model_id: number; model_name: string; car_id: number }>>([]);

  const [compatMake, setCompatMake] = useState<string>("");
  const [compatBaseModel, setCompatBaseModel] = useState<string>("");
  const [compatVariantKey, setCompatVariantKey] = useState<string>("");
  const [compatModelId, setCompatModelId] = useState<string>("");
  const [compatStartYearId, setCompatStartYearId] = useState<string>("");
  const [compatEndYearId, setCompatEndYearId] = useState<string>("");

  const parsedCarModels = useMemo<ParsedCarModel[]>(() => {
    const normalize = (value: string) => value.trim().replace(/\s+/g, " ");

    const prefix2Counts = new Map<string, number>();
    for (const m of carModels) {
      const name = normalize(m.model_name);
      const words = name.split(" ").filter(Boolean);
      if (words.length >= 2) {
        const prefix2 = words.slice(0, 2).join(" ");
        prefix2Counts.set(prefix2, (prefix2Counts.get(prefix2) ?? 0) + 1);
      }
    }

    const splitName = (nameRaw: string): { base: string; variant: string } => {
      const name = normalize(nameRaw);
      if (!name) return { base: "", variant: "" };

      // Prefer explicit separators if present.
      if (name.includes(" - ")) {
        const [base, ...rest] = name.split(" - ");
        return { base: base.trim(), variant: rest.join(" - ").trim() };
      }

      const parenMatch = name.match(/^(.*?)\s*\((.*?)\)\s*$/);
      if (parenMatch) {
        return { base: parenMatch[1].trim(), variant: parenMatch[2].trim() };
      }

      const words = name.split(" ").filter(Boolean);
      if (words.length === 1) return { base: name, variant: "" };

      const prefix1 = words[0];
      const prefix2 = words.slice(0, 2).join(" ");
      const usePrefix2 = (prefix2Counts.get(prefix2) ?? 0) >= 2;
      const base = usePrefix2 ? prefix2 : prefix1;
      const baseWordCount = base.split(" ").filter(Boolean).length;
      const variant = words.slice(baseWordCount).join(" ").trim();
      return { base, variant };
    };

    return carModels
      .map((m) => {
        const { base, variant } = splitName(m.model_name);
        const variantKey = variant ? variant : "__none__";
        return {
          model_id: m.model_id,
          model_name: m.model_name,
          car_id: m.car_id,
          base,
          variant,
          variantKey,
        };
      })
      .filter((m) => Boolean(m.base));
  }, [carModels]);

  const baseModelOptions = useMemo(() => {
    const bases = Array.from(new Set(parsedCarModels.map((m) => m.base).filter(Boolean)));
    bases.sort((a, b) => a.localeCompare(b));
    return bases;
  }, [parsedCarModels]);

  const variantOptions = useMemo(() => {
    if (!compatBaseModel) return [] as Array<{ label: string; value: string; model_id: number }>;
    const variants = parsedCarModels
      .filter((m) => m.base === compatBaseModel)
      .map((m) => ({
        label: m.variant ? m.variant : "(No variant)",
        value: m.variantKey,
        model_id: m.model_id,
      }));

    // Deduplicate by value (variantKey), keeping the first model_id.
    const seen = new Set<string>();
    const uniq: Array<{ label: string; value: string; model_id: number }> = [];
    for (const v of variants) {
      if (seen.has(v.value)) continue;
      seen.add(v.value);
      uniq.push(v);
    }
    uniq.sort((a, b) => a.label.localeCompare(b.label));
    return uniq;
  }, [compatBaseModel, parsedCarModels]);

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

    setBrands([BRAND_PLACEHOLDER, ...uniq(data.brands ?? [])]);
    setCategories([CATEGORY_PLACEHOLDER, ...uniq(data.categories ?? [])]);
  };

  const loadProduct = async (signal?: AbortSignal): Promise<void> => {
    if (!Number.isFinite(numericProductId)) return;

    const res = await fetch(`/api/products/${numericProductId}`, {
      method: "GET",
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const json = (await res.json()) as { data?: ApiProduct; error?: string };
    if (!res.ok) {
      throw new Error(json.error || "Failed to fetch product");
    }

    const p = json.data;
    if (!p) throw new Error("Product not found");

    setName(p.name);
    setDescription(p.description ?? "");
    setPurchasePrice(toStringOrEmpty(p.purchase_price));
    setSellingPrice(toStringOrEmpty(p.selling_price));
    setQuantity(toStringOrEmpty(p.quantity));
    setWeight(toStringOrEmpty(p.weight));
    setBrand(p.brand?.name ?? BRAND_PLACEHOLDER);
    setCategory(p.category?.name ?? CATEGORY_PLACEHOLDER);
    setImages((p.product_image ?? []).map((img) => ({ id: img.id, url: img.image })));
  };

  const loadCompatibilityLookups = async (make?: string, signal?: AbortSignal): Promise<void> => {
    const qs = make ? `?make=${encodeURIComponent(make)}` : "";
    const res = await fetch(`/api/admin/car-compatibility${qs}`, {
      method: "GET",
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const json = (await res.json()) as CarCompatibilityLookupResponse;
    if (!res.ok) {
      throw new Error(json.error || "Failed to load car compatibility lookups");
    }

    const data = json.data;
    if (!data) return;

    setCarMakes(data.makes ?? []);
    setCarYears(data.years ?? []);
    setCarModels(data.models ?? []);
  };

  const loadProductCompatibility = async (signal?: AbortSignal): Promise<void> => {
    if (!Number.isFinite(numericProductId)) return;

    const res = await fetch(`/api/products/${numericProductId}/compatibility`, {
      method: "GET",
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const json = (await res.json()) as { data?: ProductCompatibilityRow[]; error?: string };
    if (!res.ok) {
      throw new Error(json.error || "Failed to load product compatibility");
    }

    setCompatRows(json.data ?? []);
  };

  const canAddCompatibility =
    Boolean(compatMake) &&
    Boolean(compatModelId) &&
    Boolean(compatStartYearId) &&
    Boolean(compatEndYearId) &&
    !isLoading;

  const addCompatibility = async (): Promise<void> => {
    if (!canAddCompatibility) return;
    if (!Number.isFinite(numericProductId)) return;

    try {
      setError("");

      const res = await fetch(`/api/products/${numericProductId}/compatibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          model_id: Number(compatModelId),
          start_year_id: Number(compatStartYearId),
          end_year_id: Number(compatEndYearId),
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Failed to add compatibility");
      }

      await loadProductCompatibility();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add compatibility");
    }
  };

  const removeCompatibility = async (compatId: number): Promise<void> => {
    if (!Number.isFinite(numericProductId)) return;

    try {
      setError("");

      const res = await fetch(`/api/products/${numericProductId}/compatibility/${compatId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete compatibility");
      }

      await loadProductCompatibility();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete compatibility");
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!Number.isFinite(numericProductId)) return;

    setError("");
    setIsLoading(true);

    const controller = new AbortController();

    Promise.all([
      fetchLookups(controller.signal),
      loadProduct(controller.signal),
      loadCompatibilityLookups(undefined, controller.signal),
      loadProductCompatibility(controller.signal),
    ])
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load product");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [open, numericProductId]);

  useEffect(() => {
    if (!open) return;
    if (!compatMake) {
      setCarModels([]);
      setCompatBaseModel("");
      setCompatVariantKey("");
      setCompatModelId("");
      return;
    }

    const controller = new AbortController();
    // Reset model selection when manufacturer changes.
    setCompatBaseModel("");
    setCompatVariantKey("");
    setCompatModelId("");
    void loadCompatibilityLookups(compatMake, controller.signal).catch(() => {
      // surface error via main error box only if user is actively working
      setError("Failed to load models for selected manufacturer");
    });
    return () => controller.abort();
  }, [compatMake, open]);

  useEffect(() => {
    if (!open) return;
    if (!compatBaseModel) {
      setCompatVariantKey("");
      setCompatModelId("");
      return;
    }

    // If there's only one variant for the selected base model, auto-select it.
    if (variantOptions.length === 1) {
      setCompatVariantKey(variantOptions[0].value);
      setCompatModelId(String(variantOptions[0].model_id));
      return;
    }

    // Clear until user selects a variant.
    setCompatVariantKey("");
    setCompatModelId("");
  }, [compatBaseModel, open, variantOptions]);

  useEffect(() => {
    if (!open) return;
    if (!compatVariantKey || !compatBaseModel) return;

    const match = variantOptions.find((v) => v.value === compatVariantKey);
    if (match) setCompatModelId(String(match.model_id));
  }, [compatVariantKey, compatBaseModel, open, variantOptions]);

  const canSave = Boolean(name.trim()) && !isLoading && !isSaving && Number.isFinite(numericProductId);

  const save = async (): Promise<void> => {
    if (!canSave) return;

    try {
      setIsSaving(true);
      setError("");

      const res = await fetch(`/api/products/${numericProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name,
          description: description ? description : null,
          purchase_price: purchasePrice ? Number(purchasePrice) : null,
          selling_price: sellingPrice ? Number(sellingPrice) : null,
          quantity: quantity ? Number(quantity) : null,
          weight: weight ? Number(weight) : null,
          brandName: brand === BRAND_PLACEHOLDER ? null : brand,
          categoryName: category === CATEGORY_PLACEHOLDER ? null : category,
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Failed to update product");
      }

      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update product");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (): Promise<void> => {
    if (!Number.isFinite(numericProductId)) return;
    // Confirm deletion with the user
    // eslint-disable-next-line no-restricted-globals
    if (!confirm("Delete this product? This action cannot be undone.")) return;

    try {
      setIsSaving(true);
      setError("");

      const res = await fetch(`/api/products/${numericProductId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete product");
      }

      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete product");
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImages = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    if (!Number.isFinite(numericProductId)) return;

    try {
      setIsUploadingImages(true);
      setError("");

      const form = new FormData();
      Array.from(files).forEach((f) => form.append("files", f));

      const res = await fetch(`/api/products/${numericProductId}/images`, {
        method: "POST",
        body: form,
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload images");
      }

      await loadProduct();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload images");
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeImage = async (imageId: number): Promise<void> => {
    if (!Number.isFinite(numericProductId)) return;

    try {
      setError("");

      const res = await fetch(`/api/products/${numericProductId}/images/${imageId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete image");
      }

      await loadProduct();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete image");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product details and manage multiple images.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md p-3">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">Name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Description</div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a full description (paragraphs supported)"
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Purchase Price</div>
              <Input
                inputMode="numeric"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Selling Price</div>
              <Input
                inputMode="numeric"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Stock</div>
              <Input
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Weight</div>
              <Input
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.5"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Brand</div>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={BRAND_PLACEHOLDER} />
                </SelectTrigger>
                <SelectContent position="popper" align="start" sideOffset={4} >
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Category</div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={CATEGORY_PLACEHOLDER} />
                </SelectTrigger>
                <SelectContent position="popper" align="start" sideOffset={4} >
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Car Compatibility</div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Manufacturer</div>
                <Select value={compatMake} onValueChange={setCompatMake}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select manufacturer" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start" sideOffset={4} >
                    {carMakes.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Model</div>
                <div className="grid grid-cols-1 gap-2">
                  <Select value={compatBaseModel} onValueChange={setCompatBaseModel}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Base model" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start" sideOffset={4} >
                      {baseModelOptions.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={compatVariantKey}
                    onValueChange={setCompatVariantKey}
                    disabled={!compatBaseModel || variantOptions.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Variant" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start" sideOffset={4} >
                      {variantOptions.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Start Year</div>
                <Select value={compatStartYearId} onValueChange={setCompatStartYearId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Start" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start" sideOffset={4} >
                    {carYears.map((y) => (
                      <SelectItem key={y.year_id} value={String(y.year_id)}>
                        {y.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">End Year</div>
                <Select value={compatEndYearId} onValueChange={setCompatEndYearId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="End" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start" sideOffset={4} >
                    {carYears.map((y) => (
                      <SelectItem key={y.year_id} value={String(y.year_id)}>
                        {y.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => void addCompatibility()} disabled={!canAddCompatibility}>
                Add Compatibility
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Start Year</TableHead>
                    <TableHead>End Year</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compatRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.make}</TableCell>
                      <TableCell>{r.model_name}</TableCell>
                      <TableCell>{r.start_year ?? "?"}</TableCell>
                      <TableCell>{r.end_year ?? "?"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void removeCompatibility(r.id)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {compatRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No compatibility rows yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Images</div>

            <div className="flex items-center gap-3">
              <Input
                type="file"
                multiple
                accept="image/*"
                disabled={isUploadingImages || isLoading}
                onChange={(e) => void uploadImages(e.target.files)}
              />
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {isUploadingImages ? "Uploading…" : "WebP (max 1200px)"}
              </div>
            </div>

            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="border border-border rounded-lg p-2 space-y-2">
                    <img
                      src={img.url}
                      alt={`Product image ${img.id}`}
                      className="w-full h-28 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void removeImage(img.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No images yet.</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => void deleteProduct()}
            className="text-destructive border-destructive"
            disabled={!Number.isFinite(numericProductId) || isSaving}
          >
            {isSaving ? "Deleting…" : "Delete"}
          </Button>

          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={!canSave}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
