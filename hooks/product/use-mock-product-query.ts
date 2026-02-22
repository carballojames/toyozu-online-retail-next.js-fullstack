import { useQuery } from "@tanstack/react-query";

type ProductWithId = {
  product_id: number;
};

type UseMockProductQueryInput<T extends ProductWithId> = {
  id: number;
  products: T[];
};

export function useMockProductQuery<T extends ProductWithId>({
  id,
  products,
}: UseMockProductQueryInput<T>) {
  return useQuery({
    queryKey: ["mock-product", id],
    enabled: Number.isFinite(id),
    queryFn: async (): Promise<T | null> => {
      const found = products.find((product) => product.product_id === id) ?? null;
      return found;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
