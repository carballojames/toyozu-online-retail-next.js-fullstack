"use client";

import { useEffect, useMemo, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: number; name: string };

export type AddressCascaderValue = {
  islandGroup: "Luzon" | "Visayas" | "Mindanao" | "";
  regionId: number | null;
  municipalityId: number | null;
  barangayId: number | null;
};

type Props = {
  value: AddressCascaderValue;
  onChange: (next: AddressCascaderValue) => void;
  disabled?: boolean;
};

const ISLAND_GROUPS: Array<AddressCascaderValue["islandGroup"]> = ["", "Luzon", "Visayas", "Mindanao"];

async function fetchOptions<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store", signal });
  const json = (await res.json()) as T;
  if (!res.ok) {
    throw new Error("Failed to load options");
  }
  return json;
}

export function AddressCascader({ value, onChange, disabled }: Props) {
  const [regions, setRegions] = useState<Option[]>([]);
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [barangays, setBarangays] = useState<Option[]>([]);

  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  const islandGroupLabel = useMemo(() => {
    if (!value.islandGroup) return "Select Island Group";
    return value.islandGroup;
  }, [value.islandGroup]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoadingRegions(true);
        const q = value.islandGroup ? `?islandGroup=${encodeURIComponent(value.islandGroup)}` : "";
        const json = await fetchOptions<{ data: Option[] }>(`/api/locations/regions${q}`, controller.signal);
        setRegions(json.data ?? []);
      } catch {
        setRegions([]);
      } finally {
        setLoadingRegions(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [value.islandGroup]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!value.regionId) {
        setMunicipalities([]);
        return;
      }

      try {
        setLoadingMunicipalities(true);
        const json = await fetchOptions<{ data: Option[] }>(
          `/api/locations/municipalities?regionId=${encodeURIComponent(String(value.regionId))}`,
          controller.signal
        );
        setMunicipalities(json.data ?? []);
      } catch {
        setMunicipalities([]);
      } finally {
        setLoadingMunicipalities(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [value.regionId]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (!value.municipalityId) {
        setBarangays([]);
        return;
      }

      try {
        setLoadingBarangays(true);
        const json = await fetchOptions<{ data: Option[] }>(
          `/api/locations/barangays?municipalityId=${encodeURIComponent(String(value.municipalityId))}`,
          controller.signal
        );
        setBarangays(json.data ?? []);
      } catch {
        setBarangays([]);
      } finally {
        setLoadingBarangays(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [value.municipalityId]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm font-medium">Island group</label>
        <Select
          value={value.islandGroup}
          onValueChange={(next) => {
            onChange({ islandGroup: next as AddressCascaderValue["islandGroup"], regionId: null, municipalityId: null, barangayId: null });
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={islandGroupLabel} />
          </SelectTrigger>
          <SelectContent>
            {ISLAND_GROUPS.filter((g) => g !== "").map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Region</label>
        <Select
          value={value.regionId ? String(value.regionId) : ""}
          onValueChange={(next) => {
            const regionId = Number(next);
            onChange({ ...value, regionId: Number.isFinite(regionId) ? regionId : null, municipalityId: null, barangayId: null });
          }}
          disabled={disabled || loadingRegions}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingRegions ? "Loading regions…" : "Select region"} />
          </SelectTrigger>
          <SelectContent>
            {regions.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">City / Municipality</label>
        <Select
          value={value.municipalityId ? String(value.municipalityId) : ""}
          onValueChange={(next) => {
            const municipalityId = Number(next);
            onChange({ ...value, municipalityId: Number.isFinite(municipalityId) ? municipalityId : null, barangayId: null });
          }}
          disabled={disabled || !value.regionId || loadingMunicipalities}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={!value.regionId ? "Select region first" : loadingMunicipalities ? "Loading…" : "Select city / municipality"}
            />
          </SelectTrigger>
          <SelectContent>
            {municipalities.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Barangay</label>
        <Select
          value={value.barangayId ? String(value.barangayId) : ""}
          onValueChange={(next) => {
            const barangayId = Number(next);
            onChange({ ...value, barangayId: Number.isFinite(barangayId) ? barangayId : null });
          }}
          disabled={disabled || !value.municipalityId || loadingBarangays}
        >
          <SelectTrigger>
            <SelectValue placeholder={!value.municipalityId ? "Select city/municipality first" : loadingBarangays ? "Loading…" : "Select barangay"} />
          </SelectTrigger>
          <SelectContent>
            {barangays.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
