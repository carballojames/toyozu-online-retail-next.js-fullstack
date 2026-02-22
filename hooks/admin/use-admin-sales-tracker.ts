import { useQuery } from "@tanstack/react-query";

export type SalesRow = {
  saleId: number | null;
  deliveryId: number;
  customerName: string;
  itemsBought: number;
  totalPrice: number;
  deliveredDate: string;
};

export type SaleDetail = {
  saleId: number;
  deliveryId: number;
  customerName: string;
  paymentType: string;
  deliveredDate: string;
  totalPrice: number;
  items: Array<{ id: string; name: string; quantity: number; subtotal: number }>;
};

type ApiResponse<TData> = {
  data?: TData;
  error?: string;
};

export const ADMIN_SALES_TRACKER_QUERY_KEY = ["admin-sales-tracker"] as const;

export function getAdminSalesTrackerQueryKey(queryText: string) {
  return [...ADMIN_SALES_TRACKER_QUERY_KEY, queryText.trim()] as const;
}

export function getAdminSaleDetailQueryKey(saleId: number | null) {
  return ["admin-sale-detail", saleId ?? ""] as const;
}

async function fetchSalesTracker(queryText: string): Promise<SalesRow[]> {
  const params = new URLSearchParams();
  const normalizedQuery = queryText.trim();
  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }

  const response = await fetch(`/api/admin/sales-tracker?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await response.json()) as ApiResponse<SalesRow[]>;
  if (!response.ok || !Array.isArray(json.data)) {
    throw new Error(json.error || "Failed to load sales tracker");
  }

  return json.data.map((row) => ({
    saleId: typeof row.saleId === "number" ? row.saleId : null,
    deliveryId: Number(row.deliveryId ?? 0),
    customerName: String(row.customerName ?? ""),
    itemsBought: Number(row.itemsBought ?? 0),
    totalPrice: Number(row.totalPrice ?? 0),
    deliveredDate: String(row.deliveredDate ?? ""),
  }));
}

async function fetchSaleDetail(saleId: number): Promise<SaleDetail> {
  const response = await fetch(`/api/admin/sales-tracker/${encodeURIComponent(String(saleId))}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await response.json()) as ApiResponse<SaleDetail>;
  if (!response.ok || !json.data) {
    throw new Error(json.error || "Failed to load sale details");
  }

  return json.data;
}

export function useAdminSalesTrackerQuery(queryText: string) {
  return useQuery({
    queryKey: getAdminSalesTrackerQueryKey(queryText),
    queryFn: () => fetchSalesTracker(queryText),
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useAdminSaleDetailQuery(saleId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: getAdminSaleDetailQueryKey(saleId),
    queryFn: () => fetchSaleDetail(saleId ?? 0),
    enabled: enabled && typeof saleId === "number" && saleId > 0,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}