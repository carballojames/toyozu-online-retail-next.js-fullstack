"use client";

import { useEffect, useState } from "react";

import type { RoleId } from "@/admin-pages/admin-dashboard.types";

function normalizeRoleId(value: number): RoleId {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4
    ? (value as RoleId)
    : 4;
}

export function useAdminRole() {
  const [roleId, setRoleId] = useState<RoleId | null>(null);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("role_id") : null;
    const parsed = raw ? Number(raw) : NaN;
    setRoleId(normalizeRoleId(parsed));
  }, []);

  return roleId;
}
