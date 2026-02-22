import { useQuery } from "@tanstack/react-query";

export type DashboardRange = "today" | "7d" | "30d" | "all";

export type DashboardData = {
  range: DashboardRange;
  totals: { totalSales: number; totalSupply: number; revenue: number };
  statusCounts: Array<{ statusId: number | null; status: string; count: number }>;
  recentOrders: Array<{ id: string; date: string; customerName: string; status: string; total: number }>;
  topCustomers: Array<{ userId: number; name: string; orders: number; total: number }>;
  delivered: { day: string; count: number };
};

type DashboardResponse = {
  data?: DashboardData;
  error?: string;
};

export const ADMIN_OVERVIEW_QUERY_KEY = ["admin-overview"] as const;

export function getAdminOverviewQueryKey(range: DashboardRange, deliveredDay: string) {
  return [...ADMIN_OVERVIEW_QUERY_KEY, range, deliveredDay] as const;
}

async function fetchAdminOverview(range: DashboardRange, deliveredDay: string): Promise<DashboardData> {
  const params = new URLSearchParams();
  params.set("range", range);
  if (deliveredDay) {
    params.set("deliveredDay", deliveredDay);
  }

  const response = await fetch(`/api/admin/dashboard?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await response.json()) as DashboardResponse;
  if (!response.ok || !json.data) {
    throw new Error(json.error || "Failed to load dashboard");
  }

  return json.data;
}

export function useAdminOverviewQuery(range: DashboardRange, deliveredDay: string) {
  return useQuery({
    queryKey: getAdminOverviewQueryKey(range, deliveredDay),
    queryFn: () => fetchAdminOverview(range, deliveredDay),
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}