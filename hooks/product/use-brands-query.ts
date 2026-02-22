import { useQuery } from "@tanstack/react-query";

export type DbBrand = {
  id: number;
  name: string;
  productCount: number;
};

async function fetchBrands(): Promise<DbBrand[]> {
  const res = await fetch("/api/brands", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const json = (await res.json()) as
    | { data: { brands: DbBrand[] } }
    | { error: string };

  if (!res.ok || !("data" in json)) {
    return [];
  }

  return Array.isArray(json.data.brands) ? json.data.brands : [];
}

export function useBrandsQuery() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: fetchBrands,
    staleTime: 60_000,
    retry: 1,
  });
}
