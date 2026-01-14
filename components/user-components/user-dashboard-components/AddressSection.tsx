"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { GeocodeAddressSearch, type GeocodeAddressOption } from "@/components/common/geocode-address-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type ApiAddress = {
  id: number;
  street: string | null;
  approved_address: { id: number; label: string } | null;
  is_default: boolean;
  barangay: {
    id: number;
    name: string;
    municipality: {
      id: number;
      name: string;
      province: {
        id: number;
        name: string;
        region: { id: number; name: string } | null;
      } | null;
    } | null;
  } | null;
};

type Props = {
  userId: number;
};

function formatAddress(a: ApiAddress): string {
  const parts: string[] = [];
  if (a.approved_address?.label) parts.push(a.approved_address.label);
  else if (a.street) parts.push(a.street);
  if (a.barangay?.name) parts.push(a.barangay.name);
  if (a.barangay?.municipality?.name) parts.push(a.barangay.municipality.name);
  if (a.barangay?.municipality?.province?.name) parts.push(a.barangay.municipality.province.name);
  if (a.barangay?.municipality?.province?.region?.name) parts.push(a.barangay.municipality.province.region.name);
  return parts.filter(Boolean).join(", ");
}

export default function AddressSection({ userId }: Props) {
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<GeocodeAddressOption | null>(null);
  const [isDefault, setIsDefault] = useState(false);

  const hasDefault = useMemo(() => addresses.some((a) => a.is_default), [addresses]);

  const loadAddresses = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/me/addresses?userId=${encodeURIComponent(String(userId))}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as { data?: ApiAddress[]; error?: string };
      if (!res.ok) {
        setError(json.error || "Failed to load addresses");
        setAddresses([]);
        return;
      }

      setAddresses(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load addresses");
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const resetForm = () => {
    setQuery("");
    setSelected(null);
    setIsDefault(false);
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!selected) {
      setError("Please select an address from the search results.");
      return;
    }

    try {
      const res = await fetch("/api/me/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          userId,
          street: selected.label,
          isDefault: isDefault || !hasDefault,
        }),
      });

      const json = (await res.json()) as { data?: { id: number }; error?: string };
      if (!res.ok) {
        setError(json.error || "Failed to save address");
        return;
      }

      setShowForm(false);
      resetForm();
      setMessage("Address saved.");
      await loadAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    }
  };

  const setDefaultAddress = async (addressId: number) => {
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/me/addresses/${encodeURIComponent(String(addressId))}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ userId, isDefault: true }),
      });

      const json = (await res.json()) as { data?: { ok: boolean }; error?: string };
      if (!res.ok) {
        setError(json.error || "Failed to set default address");
        return;
      }

      setMessage("Default address updated.");
      await loadAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set default address");
    }
  };

  const removeAddress = async (addressId: number) => {
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(
        `/api/me/addresses/${encodeURIComponent(String(addressId))}?userId=${encodeURIComponent(String(userId))}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );

      const json = (await res.json()) as { data?: { ok: boolean }; error?: string };
      if (!res.ok) {
        setError(json.error || "Failed to remove address");
        return;
      }

      setMessage("Address removed.");
      await loadAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove address");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-2">My Addresses</h2>
        <p className="text-muted-foreground">Manage your delivery addresses</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Your saved delivery addresses</div>
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ Add New Address"}</Button>
        </div>

        {message ? (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">{message}</div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive">{error}</div>
        ) : null}

        {showForm && (
          <form onSubmit={handleAddAddress} className="bg-card p-6 rounded-lg border space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search address</label>
              <GeocodeAddressSearch
                value={query}
                onValueChange={(v) => {
                  setQuery(v);
                  setSelected(null);
                }}
                onSelect={(opt) => {
                  setSelected(opt);
                  setQuery(opt.label);
                }}
              />
              <p className="text-xs text-muted-foreground">Tip: type at least 3 characters.</p>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox id="isDefault" checked={isDefault} onCheckedChange={(v) => setIsDefault(Boolean(v))} />
              <label htmlFor="isDefault" className="text-sm text-muted-foreground">
                Set as default address
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                  setMessage(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save Address</Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading addresses…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((address) => (
              <div key={address.id} className="bg-card p-6 rounded-lg border relative">
                {address.is_default ? (
                  <div className="absolute top-4 right-4">
                    <Badge variant="primary">Default</Badge>
                  </div>
                ) : null}

                <div className="mb-3">
                  <div className="text-lg font-semibold text-foreground">Delivery address</div>
                  <div className="text-sm text-muted-foreground">{formatAddress(address)}</div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button type="button" variant="outline" onClick={() => void setDefaultAddress(address.id)}>
                    Set Default
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void removeAddress(address.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}