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
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load user");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [open, numericUserId]);

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
      <DialogContent>
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
