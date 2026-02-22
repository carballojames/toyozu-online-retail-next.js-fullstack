import { useQuery } from "@tanstack/react-query";

export type SupplyRow = {
  supplyId: number;
  receiptNumber: string;
  supplierName: string;
  itemsBought: number;
  totalPurchasePrice: number;
  date: string;
};

export type SupplyDetail = {
  supplyId: number;
  receiptNumber: string;
  supplierName: string;
  date: string;
  totalPurchasePrice: number;
  items: Array<{ id: string; name: string; quantity: number; purchasePrice: number; subtotal: number }>;
};

type ApiResponse<TData> = {
  data?: TData;
  error?: string;
};

export const ADMIN_SUPPLY_TRACKER_QUERY_KEY = ["admin-supply-tracker"] as const;

export function getAdminSupplyTrackerQueryKey(queryText: string) {
  return [...ADMIN_SUPPLY_TRACKER_QUERY_KEY, queryText.trim()] as const;
}

export function getAdminSupplyDetailQueryKey(supplyId: number | null) {
  return ["admin-supply-detail", supplyId ?? ""] as const;
}

async function fetchSupplyTracker(queryText: string): Promise<SupplyRow[]> {
  const params = new URLSearchParams();
  const normalizedQuery = queryText.trim();
  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }

  const response = await fetch(`/api/admin/supply-tracker?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await response.json()) as ApiResponse<SupplyRow[]>;
  if (!response.ok || !Array.isArray(json.data)) {
    throw new Error(json.error || "Failed to load supply tracker");
  }

  return json.data.map((row) => ({
    supplyId: Number(row.supplyId ?? 0),
    receiptNumber: String(row.receiptNumber ?? ""),
    supplierName: String(row.supplierName ?? ""),
    itemsBought: Number((row as unknown as { itemsBought?: unknown }).itemsBought ?? 0),
    totalPurchasePrice: Number((row as unknown as { totalPurchasePrice?: unknown }).totalPurchasePrice ?? 0),
    date: String((row as unknown as { date?: unknown }).date ?? ""),
  }));
}

async function fetchSupplyDetail(supplyId: number): Promise<SupplyDetail> {
  const response = await fetch(`/api/admin/supply-tracker/${encodeURIComponent(String(supplyId))}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await response.json()) as ApiResponse<SupplyDetail>;
  if (!response.ok || !json.data) {
    throw new Error(json.error || "Failed to load supply details");
  }

  return json.data;
}

export function useAdminSupplyTrackerQuery(queryText: string) {
  return useQuery({
    queryKey: getAdminSupplyTrackerQueryKey(queryText),
    queryFn: () => fetchSupplyTracker(queryText),
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useAdminSupplyDetailQuery(supplyId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: getAdminSupplyDetailQueryKey(supplyId),
    queryFn: () => fetchSupplyDetail(supplyId ?? 0),
    enabled: enabled && typeof supplyId === "number" && supplyId > 0,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}