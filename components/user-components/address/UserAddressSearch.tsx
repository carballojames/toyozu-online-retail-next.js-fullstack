"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

export type GeocodeAddressOption = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (option: GeocodeAddressOption) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function GeocodeAddressSearch({
  value,
  onValueChange,
  onSelect,
  disabled,
  placeholder = "Search your address…",
}: Props) {
  const [items, setItems] = useState<GeocodeAddressOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const canSearch = useMemo(() => value.trim().length >= 3, [value]);

  useEffect(() => {
    setError(null);

    if (!canSearch || disabled) {
      setItems([]);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setLoading(true);
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(value.trim())}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });

        const json = (await res.json()) as { data?: GeocodeAddressOption[]; error?: string };
        if (!res.ok) {
          setItems([]);
          setOpen(true);
          setError(json.error || "Failed to search address");
          return;
        }

        setItems(json.data ?? []);
        setOpen(true);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setItems([]);
        setOpen(true);
        setError(e instanceof Error ? e.message : "Failed to search address");
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [canSearch, disabled, value]);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => {
          if (canSearch) setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
      />

      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          {loading ? <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div> : null}
          {error ? <div className="px-3 py-2 text-sm text-destructive">{error}</div> : null}

          {!loading && !error && items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
          ) : null}

          <div className="max-h-64 overflow-auto">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
