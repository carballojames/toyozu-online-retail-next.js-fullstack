import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminOrderStatus } from "@/admin-pages/admin-dashboard.types";

export type AdminOrderRow = {
  id: string;
  saleId: number | null;
  deliveryId: number;
  date: string;
  customerName: string;
  status: AdminOrderStatus;
  total: number;
};

export type OrderDetail = {
  saleId: number | null;
  deliveryId: number;
  date: string;
  paymentType: string;
  status: AdminOrderStatus;
  trackingNumber: string | null;
  courier: { id: number; name: string } | null;
  address: { id: number; text: string } | null;
  customer: { id: number; name: string } | null;
  totals: { shipping: number; total: number };
  items: Array<{ name: string; quantity: number; subtotal: number }>;
  history: Array<{ id: string; at: string | null; status: string; sequence: number; location: string | null }>;
  statusOptions: Array<{ status_name: AdminOrderStatus; sequence_order: number }>;
};

type ApiResponse<TData> = {
  data?: TData;
  error?: string;
};

type UpdateOrderPayload = {
  saleId: string;
  statusName: string;
  trackingNumber: string;
};

export const ADMIN_ORDERS_QUERY_KEY = ["admin-orders"] as const;

export function getAdminOrderDetailQueryKey(saleId: string | null) {
  return ["admin-order-detail", saleId ?? ""] as const;
}

const ADMIN_ORDER_STATUSES: readonly AdminOrderStatus[] = [
  "Pending",
  "Prepare to ship",
  "Pickup by courier",
  "Tracking number posted",
  "In Transit",
  "Delivered",
  "Cancelled",
];

function normalizeOrderStatus(value: string): AdminOrderStatus {
  const normalized = value.trim();
  return ADMIN_ORDER_STATUSES.includes(normalized as AdminOrderStatus)
    ? (normalized as AdminOrderStatus)
    : "Pending";
}

async function fetchAdminOrders(): Promise<AdminOrderRow[]> {
  const response = await fetch("/api/admin/orders", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const json = (await response.json()) as ApiResponse<AdminOrderRow[]>;
  if (!response.ok || !Array.isArray(json.data)) {
    throw new Error(json.error || "Failed to load orders");
  }

  return json.data.map((order) => ({
    ...order,
    status: normalizeOrderStatus(order.status),
  }));
}

async function fetchAdminOrderDetail(saleId: string): Promise<OrderDetail> {
  const response = await fetch(`/api/admin/orders/${encodeURIComponent(saleId)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await response.json()) as ApiResponse<OrderDetail>;
  if (!response.ok || !json.data) {
    throw new Error(json.error || "Failed to load order");
  }

  return {
    ...json.data,
    status: normalizeOrderStatus(json.data.status),
    statusOptions: (json.data.statusOptions ?? []).map((option) => ({
      ...option,
      status_name: normalizeOrderStatus(option.status_name),
    })),
  };
}

export function useAdminOrdersQuery() {
  return useQuery({
    queryKey: ADMIN_ORDERS_QUERY_KEY,
    queryFn: fetchAdminOrders,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useAdminOrderDetailQuery(saleId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: getAdminOrderDetailQueryKey(saleId),
    queryFn: () => fetchAdminOrderDetail(saleId ?? ""),
    enabled: enabled && Boolean(saleId),
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useUpdateAdminOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, statusName, trackingNumber }: UpdateOrderPayload) => {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(saleId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ statusName, trackingNumber }),
      });

      const json = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) {
        throw new Error(json.error || "Failed to update order");
      }

      return json;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: getAdminOrderDetailQueryKey(variables.saleId) }),
      ]);
    },
  });
}