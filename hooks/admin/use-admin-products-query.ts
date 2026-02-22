import { useQuery } from "@tanstack/react-query";

import type { AdminProduct } from "@/admin-pages/admin-dashboard.types";

type ApiProduct = {
  product_id: number;
  name: string;
  selling_price: number | null;
  quantity: number | null;
  brand?: { name: string } | null;
  category?: { name: string } | null;
};

export const ADMIN_PRODUCTS_QUERY_KEY = ["admin-products"] as const;

async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const response = await fetch("/api/products", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  const json = (await response.json()) as { data?: ApiProduct[] };

  return (json.data ?? []).map((product) => ({
    id: String(product.product_id),
    name: product.name,
    brand: product.brand?.name ?? "",
    category: product.category?.name ?? "",
    price: product.selling_price ?? 0,
    stock: product.quantity ?? 0,
  }));
}

export function useAdminProductsQuery() {
  return useQuery({
    queryKey: ADMIN_PRODUCTS_QUERY_KEY,
    queryFn: fetchAdminProducts,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
