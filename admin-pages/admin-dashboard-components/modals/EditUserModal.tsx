"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AddressCascader, type AddressCascaderValue } from "@/components/common/address-cascader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type ApiUser = {
  user_id: number;
  user_name: string;
  username: string;
  email: string | null;
  mobile_phone: string | null;
  role_id: number;
  is_superuser: boolean | null;
  contact_type: string | null;
};

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
  open: boolean;
  userId: number | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "1", label: "Admin" },
  { value: "2", label: "Manager" },
  { value: "3", label: "Employee" },
  { value: "4", label: "Customer" },
];

function toStringOrEmpty(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

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

export default function EditUserModal({ open, userId, onOpenChange, onSaved }: Props) {
  const numericUserId = useMemo(() => {
    if (!userId) return NaN;
    return Number.isFinite(userId) ? userId : NaN;
  }, [userId]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [userName, setUserName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [mobilePhone, setMobilePhone] = useState<string>("");
  const [roleId, setRoleId] = useState<string>("4");
  const [contactType, setContactType] = useState<string>("email");

  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState<string>("");
  const [addressApprovedId, setAddressApprovedId] = useState<string>("");
  const [approvedOptions, setApprovedOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [addressIsDefault, setAddressIsDefault] = useState(false);
  const [addressCascade, setAddressCascade] = useState<AddressCascaderValue>({
    islandGroup: "",
    regionId: null,
    municipalityId: null,
    barangayId: null,
  });

  const loadApprovedAddresses = useCallback(async (barangayId: number | null) => {
    if (!barangayId) {
      setApprovedOptions([]);
      setAddressApprovedId("");
      return;
    }

    try {
      setApprovedLoading(true);
      const res = await fetch(`/api/locations/approved-addresses?barangayId=${encodeURIComponent(String(barangayId))}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as { data?: Array<{ id: number; label: string }>; error?: string };
      if (!res.ok) {
        setApprovedOptions([]);
        setAddressApprovedId("");
        setAddressesError(json.error || "Failed to load approved addresses");
        return;
      }

      setApprovedOptions(json.data ?? []);
      setAddressApprovedId("");
    } catch (e) {
      setApprovedOptions([]);
      setAddressApprovedId("");
      setAddressesError(e instanceof Error ? e.message : "Failed to load approved addresses");
    } finally {
      setApprovedLoading(false);
    }
  }, []);

  const loadAddresses = useCallback(async () => {
    if (!Number.isFinite(numericUserId)) return;

    try {
      setAddressesLoading(true);
      setAddressesError("");

      const res = await fetch(`/api/admin/users/${encodeURIComponent(String(numericUserId))}/addresses`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as { data?: ApiAddress[]; error?: string };
      if (!res.ok) {
        setAddressesError(json.error || "Failed to load addresses");
        setAddresses([]);
        return;
      }

      setAddresses(json.data ?? []);
    } catch (e) {
      setAddressesError(e instanceof Error ? e.message : "Failed to load addresses");
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }, [numericUserId]);

  useEffect(() => {
    if (!open) return;
    if (!Number.isFinite(numericUserId)) return;

    const controller = new AbortController();

    async function load() {
      try {
        setIsLoading(true);
        setError("");

        const res = await fetch(`/api/admin/users/${encodeURIComponent(String(numericUserId))}`, {
          method: "GET",
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const json = (await res.json()) as { data?: ApiUser; error?: string };
        if (!res.ok || !json.data) {
          setError(json.error || "Failed to load user");
          return;
        }

        const u = json.data;
        setUserName(toStringOrEmpty(u.user_name));
        setUsername(toStringOrEmpty(u.username));
        setEmail(toStringOrEmpty(u.email));
        setMobilePhone(toStringOrEmpty(u.mobile_phone));
        setRoleId(String(u.role_id ?? 4));
        setContactType(u.contact_type === "phone" ? "phone" : "email");

        await loadAddresses();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load user");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [open, numericUserId, loadAddresses]);

  const saveAddress = async (): Promise<void> => {
    if (!Number.isFinite(numericUserId)) return;

    setAddressesError("");

    const approvedIdNum = addressApprovedId ? Number(addressApprovedId) : NaN;
    if (!Number.isFinite(approvedIdNum)) {
      setAddressesError("Select an approved address.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(String(numericUserId))}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          approvedAddressId: approvedIdNum,
          isDefault: addressIsDefault,
        }),
      });

      const json = (await res.json()) as { data?: { id: number }; error?: string };
      if (!res.ok) {
        setAddressesError(json.error || "Failed to create address");
        return;
      }

      setAddressApprovedId("");
      setAddressIsDefault(false);
      setAddressCascade({ islandGroup: "", regionId: null, municipalityId: null, barangayId: null });
      setApprovedOptions([]);
      await loadAddresses();
    } catch (e) {
      setAddressesError(e instanceof Error ? e.message : "Failed to create address");
    }
  };

  const save = async (): Promise<void> => {
    if (!Number.isFinite(numericUserId)) return;

    try {
      setIsSaving(true);
      setError("");

      const res = await fetch(`/api/admin/users/${encodeURIComponent(String(numericUserId))}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          user_name: userName.trim(),
          username: username.trim(),
          email: email.trim() ? email.trim() : null,
          mobile_phone: mobilePhone.trim() ? mobilePhone.trim() : null,
          role_id: Number(roleId),
          contact_type: contactType === "phone" ? "phone" : "email",
        }),
      });

      const json = (await res.json()) as { data?: ApiUser; error?: string };
      if (!res.ok) {
        setError(json.error || "Failed to update user");
        return;
      }

      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="  max-h-[800px] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update user details. Password is not editable here.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="space-y-3">
          <div>
            <label className="block mb-1 text-sm">Name</label>
            <Input value={userName} onChange={(e) => setUserName(e.target.value)} disabled={isLoading} />
          </div>

          <div>
            <label className="block mb-1 text-sm">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} disabled={isLoading} />
          </div>

          <div>
            <label className="block mb-1 text-sm">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
          </div>

          <div>
            <label className="block mb-1 text-sm">Phone</label>
            <Input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} disabled={isLoading} />
          </div>

          <div>
            <label className="block mb-1 text-sm">Role</label>
            <Select value={roleId} onValueChange={setRoleId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block mb-1 text-sm">Contact type</label>
            <Select value={contactType} onValueChange={setContactType} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select contact type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Addresses</div>

              </div>
              <Button type="button" variant="outline" onClick={() => void loadAddresses()} disabled={addressesLoading}>
                Refresh
              </Button>
            </div>

            {addressesError ? <p className="text-sm text-destructive">{addressesError}</p> : null}


            <div className="mt-3 space-y-2">
              {addressesLoading ? <div className="text-sm text-muted-foreground">Loading addresses…</div> : null}
              {!addressesLoading && addresses.length === 0 ? (
                <div className="text-sm text-muted-foreground">No addresses yet.</div>
              ) : null}
              {addresses.map((a) => (
                <div key={a.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-foreground">{formatAddress(a) || "(incomplete address)"}</div>
                    {a.is_default ? <span className="text-xs text-muted-foreground">Default</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={isSaving || isLoading}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
