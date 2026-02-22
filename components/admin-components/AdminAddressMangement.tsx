"use client";

import { useMemo, useState } from "react";

import { AddressCascader, type AddressCascaderValue } from "@/components/user-components/address/UserAddressCascader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  useAdminAddressesQuery,
  useCreateApprovedAddressMutation,
  useDeleteApprovedAddressMutation,
  useToggleApprovedAddressMutation,
} from "@/hooks/admin/use-admin-addresses";

import type { ApprovedAddressRow } from "@/hooks/admin/use-admin-addresses";

function formatRow(r: ApprovedAddressRow): string {
  const parts: string[] = [r.street];
  parts.push(r.barangay.name);
  if (r.barangay.municipality?.name) parts.push(r.barangay.municipality.name);
  if (r.barangay.municipality?.province?.name) parts.push(r.barangay.municipality.province.name);
  if (r.barangay.municipality?.province?.region?.name) parts.push(r.barangay.municipality.province.region.name);
  return parts.filter(Boolean).join(", ");
}

export default function AddressManagementPage() {
  const addressesQuery = useAdminAddressesQuery();
  const createMutation = useCreateApprovedAddressMutation();
  const toggleMutation = useToggleApprovedAddressMutation();
  const deleteMutation = useDeleteApprovedAddressMutation();

  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const [cascade, setCascade] = useState<AddressCascaderValue>({
    islandGroup: "",
    regionId: null,
    municipalityId: null,
    barangayId: null,
  });
  const [street, setStreet] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  const rows = useMemo(() => addressesQuery.data ?? [], [addressesQuery.data]);
  const loading = addressesQuery.isLoading || addressesQuery.isFetching;
  const busy = createMutation.isPending || toggleMutation.isPending || deleteMutation.isPending;

  const queryError = addressesQuery.error instanceof Error ? addressesQuery.error.message : "";

  const create = async (): Promise<void> => {
    setMessage("");
    setError("");

    if (!cascade.barangayId) {
      setError("Select a barangay.");
      return;
    }

    if (!street.trim()) {
      setError("Enter an address line.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        barangayId: cascade.barangayId,
        street: street.trim(),
        isActive,
      });

      setStreet("");
      setIsActive(true);
      setCascade({ islandGroup: "", regionId: null, municipalityId: null, barangayId: null });
      setMessage("Approved address added.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create approved address");
    }
  };

  const toggleActive = async (id: number, next: boolean): Promise<void> => {
    setMessage("");
    setError("");

    try {
      await toggleMutation.mutateAsync({ id, isActive: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update address");
    }
  };

  const remove = async (id: number): Promise<void> => {
    setMessage("");
    setError("");

    try {
      await deleteMutation.mutateAsync(id);

      setMessage("Deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete address");
    }
  };

  const activeCount = useMemo(() => rows.filter((r) => r.is_active).length, [rows]);
  const mergedError = error || queryError;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="text-xl font-semibold text-foreground">Approved Addresses</div>
        <div className="text-sm text-muted-foreground">
          Admin-only list. Users can only select addresses from here.
        </div>

        {message ? <div className="mt-3 text-sm text-foreground">{message}</div> : null}
        {mergedError ? <div className="mt-3 text-sm text-destructive">{mergedError}</div> : null}

        <div className="mt-4 space-y-3">
          <AddressCascader value={cascade} onChange={setCascade} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Address line (approved)</label>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street / House / Building No." />
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="isActive" checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
            <label htmlFor="isActive" className="text-sm text-muted-foreground">
              Active (visible to users)
            </label>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={() => void create()} disabled={busy}>
              Add approved address
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Total: {rows.length} • Active: {activeCount}</div>
          </div>
          <Button type="button" variant="outline" onClick={() => void addressesQuery.refetch()} disabled={loading || busy}>
            Refresh
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
          {!loading && rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No approved addresses yet.</div>
          ) : null}

          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-foreground">{formatRow(r)}</div>
                  <div className="text-xs text-muted-foreground">{r.is_active ? "Active" : "Inactive"}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void toggleActive(r.id, !r.is_active)}
                    disabled={loading || busy}
                  >
                    {r.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void remove(r.id)} disabled={loading || busy}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
