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

type LookupCar = { car_id: number; make: string };
type LookupModel = { model_id: number; model_name: string; car_id: number };
type LookupYear = { year_id: number; year: number };

type Lookups = {
  cars: LookupCar[];
  models: LookupModel[];
  years: LookupYear[];
};

type CompatibilityEntry = {
  id: number;
  car_id: number | null;
  make: string;
  model_id: number;
  base_model: string;
  variant: string;
  start_year: number | null;
  end_year: number | null;
};

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function parseYear(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 1900 || parsed > 2100) return null;
  return parsed;
}

export default function CarCompatibilityPage() {
  const [lookups, setLookups] = useState<Lookups>({ cars: [], models: [], years: [] });
  const [entries, setEntries] = useState<CompatibilityEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [makeInput, setMakeInput] = useState<string>("");
  const [baseModelInput, setBaseModelInput] = useState<string>("");
  const [variantInput, setVariantInput] = useState<string>("");

  const [selectedStartYearId, setSelectedStartYearId] = useState<string>("");
  const [selectedEndYearId, setSelectedEndYearId] = useState<string>("");
  const [typedStartYear, setTypedStartYear] = useState<string>("");
  const [typedEndYear, setTypedEndYear] = useState<string>("");

  const [saving, setSaving] = useState<boolean>(false);

  const loadEntries = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/car-compatibility/entries", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const json = (await res.json()) as { data?: CompatibilityEntry[]; error?: string };
      if (!res.ok || !Array.isArray(json.data)) {
        setError(json.error || "Failed to load compatibility entries");
        setEntries([]);
        return;
      }
      setEntries(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load compatibility entries");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async (carId?: string) => {
    try {
      const q = new URLSearchParams();
      if (carId) q.set("carId", carId);
      const res = await fetch(`/api/admin/car-compatibility/lookups?${q.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const json = (await res.json()) as { data?: Lookups; error?: string };
      if (!res.ok || !json.data) return;
      setLookups(json.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadLookups();
    void loadEntries();
  }, []);

  useEffect(() => {
    if (!selectedCarId) {
      setLookups((prev) => ({ ...prev, models: [] }));
      return;
    }
    void loadLookups(selectedCarId);
  }, [selectedCarId]);

  const rows = useMemo(() => {
    const unique = new Map<string, CompatibilityEntry>();
    for (const e of entries) {
      const key = [e.make, e.model_id, e.start_year ?? "", e.end_year ?? ""].join("|");
      if (!unique.has(key)) unique.set(key, e);
    }
    return [...unique.values()].sort((a, b) => {
      const makeCompare = a.make.localeCompare(b.make);
      if (makeCompare !== 0) return makeCompare;
      const baseCompare = a.base_model.localeCompare(b.base_model);
      if (baseCompare !== 0) return baseCompare;
      return a.variant.localeCompare(b.variant);
    });
  }, [entries]);

  const modelsForSelectedCar = useMemo(() => {
    const id = Number(selectedCarId);
    if (!Number.isFinite(id)) return [];
    return lookups.models.filter((m) => m.car_id === id);
  }, [lookups.models, selectedCarId]);

  const baseModelsForSelectedCar = useMemo(() => {
    const set = new Set<string>();
    for (const m of modelsForSelectedCar) {
      const [base] = m.model_name.split("-").map((s) => s.trim());
      if (base) set.add(base);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [modelsForSelectedCar]);

  const startYear = useMemo(() => {
    if (typedStartYear.trim()) return parseYear(typedStartYear);
    const selectedId = Number.parseInt(selectedStartYearId, 10);
    if (!Number.isFinite(selectedId)) return null;
    return lookups.years.find((y) => y.year_id === selectedId)?.year ?? null;
  }, [lookups.years, selectedStartYearId, typedStartYear]);

  const endYear = useMemo(() => {
    if (typedEndYear.trim()) return parseYear(typedEndYear);
    const selectedId = Number.parseInt(selectedEndYearId, 10);
    if (!Number.isFinite(selectedId)) return null;
    return lookups.years.find((y) => y.year_id === selectedId)?.year ?? null;
  }, [lookups.years, selectedEndYearId, typedEndYear]);

  const canSave = useMemo(() => {
    const make = normalizeName(makeInput);
    const base = normalizeName(baseModelInput);
    if (!make || !base) return false;
    if (startYear === null || endYear === null) return false;
    return startYear <= endYear;
  }, [baseModelInput, endYear, makeInput, startYear]);

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        make: normalizeName(makeInput),
        baseModel: normalizeName(baseModelInput),
        variant: normalizeName(variantInput),
        startYear,
        endYear,
      };
      const res = await fetch("/api/admin/car-compatibility/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { data?: unknown; error?: string };
      if (!res.ok) {
        setError(json.error || "Failed to add fitment");
        return;
      }
      setVariantInput("");
      setTypedStartYear("");
      setTypedEndYear("");
      setSelectedStartYearId("");
      setSelectedEndYearId("");
      await loadLookups(selectedCarId || undefined);
      await loadEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add fitment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError("");
    try {
      const res = await fetch(`/api/admin/car-compatibility/entries/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error || "Failed to delete fitment");
        return;
      }
      await loadEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete fitment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Car Compatibility</h2>
          <p className="text-sm text-muted-foreground">
            Staff-managed vehicle fitments (product linking will be added later).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadEntries} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-3">
          {error}
        </div>
      ) : null}

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="text-lg font-semibold text-foreground">Add Fitment</div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <div className="text-sm font-medium">Existing Make (optional)</div>
            <Select
              value={selectedCarId}
              onValueChange={(v) => {
                setSelectedCarId(v);
                const car = lookups.cars.find((c) => String(c.car_id) === v);
                setMakeInput(car?.make ?? "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select make" />
              </SelectTrigger>
              <SelectContent>
                {lookups.cars.map((c) => (
                  <SelectItem key={c.car_id} value={String(c.car_id)}>
                    {c.make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Make</div>
            <Input
              value={makeInput}
              onChange={(e) => setMakeInput(e.target.value)}
              placeholder="e.g. Toyota"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Existing Base Model (optional)</div>
            <Select value={baseModelInput} onValueChange={setBaseModelInput} disabled={!selectedCarId}>
              <SelectTrigger>
                <SelectValue placeholder={selectedCarId ? "Select base model" : "Select make first"} />
              </SelectTrigger>
              <SelectContent>
                {baseModelsForSelectedCar.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Base Model</div>
            <Input
              value={baseModelInput}
              onChange={(e) => setBaseModelInput(e.target.value)}
              placeholder="e.g. Hilux"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Variant (optional)</div>
            <Input
              value={variantInput}
              onChange={(e) => setVariantInput(e.target.value)}
              placeholder="e.g. GRS 4x4"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Start Year</div>
            <Select
              value={selectedStartYearId}
              onValueChange={(v) => {
                setSelectedStartYearId(v);
                setTypedStartYear("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {lookups.years
                  .slice()
                  .sort((a, b) => b.year - a.year)
                  .map((y) => (
                    <SelectItem key={y.year_id} value={String(y.year_id)}>
                      {y.year}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              value={typedStartYear}
              onChange={(e) => {
                setTypedStartYear(e.target.value);
                if (e.target.value.trim()) setSelectedStartYearId("");
              }}
              inputMode="numeric"
              placeholder="Or type a new year (e.g. 2026)"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">End Year</div>
            <Select
              value={selectedEndYearId}
              onValueChange={(v) => {
                setSelectedEndYearId(v);
                setTypedEndYear("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {lookups.years
                  .slice()
                  .sort((a, b) => b.year - a.year)
                  .map((y) => (
                    <SelectItem key={y.year_id} value={String(y.year_id)}>
                      {y.year}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              value={typedEndYear}
              onChange={(e) => {
                setTypedEndYear(e.target.value);
                if (e.target.value.trim()) setSelectedEndYearId("");
              }}
              inputMode="numeric"
              placeholder="Or type a new year (e.g. 2026)"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={handleCreate} disabled={!canSave || saving}>
            {saving ? "Saving…" : "Add Fitment"}
          </Button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Make</TableHead>
                <TableHead>Base Model</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Years</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    {loading ? "Loading…" : "No fitments yet."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={String(r.id)}>
                    <TableCell className="font-medium">{r.make || "—"}</TableCell>
                    <TableCell>{r.base_model || "—"}</TableCell>
                    <TableCell>{r.variant || "—"}</TableCell>
                    <TableCell>
                      {r.start_year && r.end_year ? `${r.start_year} - ${r.end_year}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(r.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
