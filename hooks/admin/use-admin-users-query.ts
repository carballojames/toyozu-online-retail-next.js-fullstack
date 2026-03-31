import { useQuery } from "@tanstack/react-query";

import type { AdminUserRow } from "@/components/admin-components/tables/AdminUsersTable";

export const ADMIN_USERS_QUERY_KEY = ["admin-users"] as const;

type ApiMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type ApiUsersResponse = {
  data?: AdminUserRow[];
  meta?: Partial<ApiMeta>;
  error?: string;
};

export type AdminUsersPage = {
  users: AdminUserRow[];
  meta: ApiMeta;
};

async function fetchAdminUsersPage(params: {
  page: number;
  pageSize: number;
  query: string;
}): Promise<AdminUsersPage> {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  const trimmed = params.query.trim();
  if (trimmed) searchParams.set("q", trimmed);

  const response = await fetch(`/api/admin/users?${searchParams.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await response.json()) as ApiUsersResponse;
  if (!response.ok || !Array.isArray(json.data)) {
    throw new Error(json.error ?? "Failed to fetch users");
  }

  const users = json.data;
  const meta = json.meta;

  return {
    users,
    meta: {
      page: meta?.page ?? params.page,
      pageSize: meta?.pageSize ?? params.pageSize,
      total: meta?.total ?? users.length,
      totalPages: meta?.totalPages ?? 1,
      hasNextPage: meta?.hasNextPage ?? false,
      hasPrevPage: meta?.hasPrevPage ?? false,
    },
  };
}

export function useAdminUsersPageQuery(params: {
  page: number;
  pageSize?: number;
  query: string;
  enabled?: boolean;
}) {
  const pageSize = params.pageSize ?? 10;

  return useQuery({
    queryKey: [...ADMIN_USERS_QUERY_KEY, "page", params.page, pageSize, params.query],
    queryFn: () =>
      fetchAdminUsersPage({
        page: params.page,
        pageSize,
        query: params.query,
      }),
    enabled: params.enabled ?? true,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
