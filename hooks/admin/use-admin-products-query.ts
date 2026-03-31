import { useQuery } from "@tanstack/react-query";

import type { AdminProduct } from "@/pages/admin-pages/admin-dashboard.types";

type ApiProduct = {
  product_id: number;
  name: string;
  selling_price: number | null;
  quantity: number | null;
  brand?: { name: string } | null;
  category?: { name: string } | null;
};

type ApiMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type ApiProductsResponse = {
  data?: ApiProduct[];
  meta?: Partial<ApiMeta>;
};

export const ADMIN_PRODUCTS_QUERY_KEY = ["admin-products"] as const;

export type AdminProductsPage = {
  products: AdminProduct[];
  meta: ApiMeta;
};

function mapProducts(items: ApiProduct[]): AdminProduct[] {
  return items.map((product) => ({
    id: String(product.product_id),
    name: product.name,
    brand: product.brand?.name ?? "",
    category: product.category?.name ?? "",
    price: product.selling_price ?? 0,
    stock: product.quantity ?? 0,
  }));
}

async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const response = await fetch("/api/products", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  const json = (await response.json()) as ApiProductsResponse;

  return mapProducts(json.data ?? []);
}

async function fetchAdminProductsPage(params: {
  page: number;
  pageSize: number;
  query: string;
}): Promise<AdminProductsPage> {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  const trimmed = params.query.trim();
  if (trimmed) searchParams.set("q", trimmed);

  const response = await fetch(`/api/products?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  const json = (await response.json()) as ApiProductsResponse;
  const products = mapProducts(json.data ?? []);
  const meta = json.meta;

  return {
    products,
    meta: {
      page: meta?.page ?? params.page,
      pageSize: meta?.pageSize ?? params.pageSize,
      total: meta?.total ?? products.length,
      totalPages: meta?.totalPages ?? 1,
      hasNextPage: meta?.hasNextPage ?? false,
      hasPrevPage: meta?.hasPrevPage ?? false,
    },
  };
}

export function useAdminProductsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...ADMIN_PRODUCTS_QUERY_KEY, "list"],
    queryFn: fetchAdminProducts,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    enabled: options?.enabled ?? true,
  });
}

export function useAdminProductsPageQuery(params: {
  page: number;
  pageSize?: number;
  query: string;
  enabled?: boolean;
}) {
  const pageSize = params.pageSize ?? 10;

  return useQuery({
    queryKey: [...ADMIN_PRODUCTS_QUERY_KEY, "page", params.page, pageSize, params.query],
    queryFn: () =>
      fetchAdminProductsPage({
        page: params.page,
        pageSize,
        query: params.query,
      }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    enabled: params.enabled ?? true,
  });
}
