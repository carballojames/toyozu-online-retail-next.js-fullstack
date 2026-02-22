import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type CheckoutItem = {
  product: string;
  product_name: string;
  product_image?: string;
  brand_name?: string;
  category_name?: string;
  selling_price: number;
  quantity: number;
};

type CheckoutData = {
  items: CheckoutItem[];
};

export type Address = {
  id: string;
  label: string;
  lines: string[];
};

export type Courier = {
  id: string;
  name: string;
  eta: string;
  base_rate: number;
  rate_per_kg: number;
  max_weight: number | null;
};

const CHECKOUT_STORAGE_KEY = "checkoutData";

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readUserIdFromStorage(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user_id");
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function normalizeCheckoutItems(value: unknown): CheckoutItem[] {
  if (!Array.isArray(value)) return [];

  const normalizedItems: CheckoutItem[] = [];

  for (const raw of value) {
    const item = raw as Partial<CheckoutItem>;
    if (!item.product || !item.product_name) continue;

    const sellingPrice = Number(item.selling_price);
    const quantity = Number(item.quantity);
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    normalizedItems.push({
      product: String(item.product),
      product_name: String(item.product_name),
      product_image: item.product_image ? String(item.product_image) : undefined,
      brand_name: item.brand_name ? String(item.brand_name) : undefined,
      category_name: item.category_name ? String(item.category_name) : undefined,
      selling_price: sellingPrice,
      quantity: Math.max(1, Math.floor(quantity)),
    });
  }

  return normalizedItems;
}

export function useCheckoutItemsQuery() {
  return useQuery({
    queryKey: ["checkout-items"],
    queryFn: async (): Promise<CheckoutItem[]> => {
      if (typeof window === "undefined") return [];
      const parsed = safeParseJson<unknown>(localStorage.getItem(CHECKOUT_STORAGE_KEY));
      if (!parsed || typeof parsed !== "object") return [];
      const rawItems = (parsed as Partial<CheckoutData>).items;
      return normalizeCheckoutItems(rawItems);
    },
    staleTime: Infinity,
  });
}

export function useCheckoutLookupsQuery() {
  return useQuery({
    queryKey: ["checkout-lookups"],
    queryFn: async (): Promise<{
      userId: number | null;
      addresses: Address[];
      couriers: Courier[];
    }> => {
      const userId = readUserIdFromStorage();
      const url = userId ? `/api/checkout/lookups?userId=${userId}` : "/api/checkout/lookups";

      const res = await fetch(url, {
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as
        | { data?: { couriers?: Courier[]; addresses?: Address[] }; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(json?.error || `Failed to load checkout lookups (${res.status})`);
      }

      const couriers = json?.data?.couriers?.length ? json.data.couriers : [];
      const addresses = userId
        ? json?.data?.addresses?.length
          ? json.data.addresses
          : []
        : [];

      return {
        userId,
        addresses,
        couriers,
      };
    },
    retry: 1,
  });
}

export function useProductWeightsQuery(items: CheckoutItem[]) {
  const productIds = useMemo(() => {
    const ids = items
      .map((item) => Number(item.product))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Math.floor(value));

    return Array.from(new Set(ids));
  }, [items]);

  return useQuery({
    queryKey: ["product-weights", productIds.join(",")],
    enabled: productIds.length > 0,
    queryFn: async (): Promise<Record<string, number>> => {
      const res = await fetch("/api/products/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      });

      if (!res.ok) throw new Error("Failed to load product weights");
      const json = (await res.json()) as { data?: { weightsKg?: Record<string, number> } };
      return json.data?.weightsKg ?? {};
    },
  });
}

type PlaceOrderPayload = {
  userId: number;
  addressId: string;
  courierId: string;
  paymentType: "CASH_ON_DELIVERY";
  items: Array<{ productId: string; quantity: number }>;
};

type PlaceOrderResponse = {
  data?: { saleId?: number; total?: number };
  error?: string;
};

export function usePlaceOrderMutation() {
  return useMutation({
    mutationFn: async (payload: PlaceOrderPayload) => {
      const res = await fetch("/api/checkout/place", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as PlaceOrderResponse;
      if (!res.ok || !json.data?.saleId) {
        throw new Error(json.error || "Failed to place order");
      }

      return json.data;
    },
  });
}
