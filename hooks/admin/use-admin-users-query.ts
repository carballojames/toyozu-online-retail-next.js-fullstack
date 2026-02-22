import { useQuery } from "@tanstack/react-query";

import type { AdminUserRow } from "@/components/admin-components/tables/AdminUsersTable";

export const ADMIN_USERS_QUERY_KEY = ["admin-users"] as const;

export function getAdminUsersQueryKey(queryText: string) {
  return [...ADMIN_USERS_QUERY_KEY, queryText.trim()] as const;
}

async function fetchAdminUsers(queryText: string): Promise<AdminUserRow[]> {
  const params = new URLSearchParams();
  const normalizedQuery = queryText.trim();
  if (normalizedQuery) params.set("q", normalizedQuery);

  const response = await fetch(`/api/admin/users?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await response.json()) as { data?: AdminUserRow[]; error?: string };
  if (!response.ok || !Array.isArray(json.data)) {
    throw new Error(json.error || "Failed to fetch users");
  }

  return json.data;
}

export function useAdminUsersQuery(queryText: string, enabled: boolean) {
  return useQuery({
    queryKey: getAdminUsersQueryKey(queryText),
    queryFn: () => fetchAdminUsers(queryText),
    enabled,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
