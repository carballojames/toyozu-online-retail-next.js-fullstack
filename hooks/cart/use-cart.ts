import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ProductId = string;

export interface CartItem {
  product: ProductId;
  product_name: string;
  product_image?: string;
  brand_name?: string;
  category_name?: string;
  selling_price: number;
  quantity: number;
  price_at_addition?: number;
}

const CART_STORAGE_KEY = "cartItems";

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readUserIdFromStorage(): number {
  if (typeof window === "undefined") return NaN;
  const raw = localStorage.getItem("user_id");
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
}

function readCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParseJson<unknown>(localStorage.getItem(CART_STORAGE_KEY));
  if (!Array.isArray(parsed)) return [];

  const normalizedItems: CartItem[] = [];

  for (const raw of parsed) {
    const item = raw as Partial<CartItem>;
    if (!item.product || !item.product_name) continue;

    const sellingPrice = Number(item.selling_price);
    const quantity = Number(item.quantity);
    if (!Number.isFinite(sellingPrice) || !Number.isFinite(quantity)) continue;

    normalizedItems.push({
      product: String(item.product),
      product_name: String(item.product_name),
      product_image: item.product_image ? String(item.product_image) : undefined,
      brand_name: item.brand_name ? String(item.brand_name) : undefined,
      category_name: item.category_name ? String(item.category_name) : undefined,
      selling_price: sellingPrice,
      quantity: Math.max(1, quantity),
      price_at_addition:
        item.price_at_addition !== undefined ? Number(item.price_at_addition) : undefined,
    });
  }

  return normalizedItems;
}

function writeCartToStorage(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart:updated"));
}

export function useCartQuery() {
  return useQuery({
    queryKey: ["cart-items"],
    queryFn: async (): Promise<CartItem[]> => {
      const userId = readUserIdFromStorage();

      if (Number.isFinite(userId)) {
        const res = await fetch(`/api/cart?userId=${encodeURIComponent(String(userId))}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const json = (await res.json()) as { data?: { items: CartItem[] }; error?: string };
        if (res.ok && json.data) return json.data.items ?? [];
      }

      return readCartFromStorage();
    },
    staleTime: 0,
  });
}

export function useUpdateCartQuantityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const userId = readUserIdFromStorage();

      if (Number.isFinite(userId)) {
        await fetch(`/api/cart/${encodeURIComponent(productId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ userId, quantity }),
        });
        return;
      }

      const current = (queryClient.getQueryData<CartItem[]>(["cart-items"]) ?? []).map((item) =>
        item.product === productId ? { ...item, quantity } : item,
      );
      writeCartToStorage(current);
    },
    onMutate: ({ productId, quantity }) => {
      queryClient.setQueryData<CartItem[]>(["cart-items"], (previous) => {
        const current = previous ?? [];
        return current.map((item) =>
          item.product === productId ? { ...item, quantity } : item,
        );
      });
    },
  });
}

export function useDeleteCartItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId }: { productId: string }) => {
      const userId = readUserIdFromStorage();

      if (Number.isFinite(userId)) {
        await fetch(`/api/cart/${encodeURIComponent(productId)}?userId=${encodeURIComponent(String(userId))}`, {
          method: "DELETE",
          headers: { Accept: "application/json" },
        });
        return;
      }

      const current = queryClient.getQueryData<CartItem[]>(["cart-items"]) ?? [];
      const next = current.filter((item) => item.product !== productId);
      writeCartToStorage(next);
    },
    onMutate: ({ productId }) => {
      queryClient.setQueryData<CartItem[]>(["cart-items"], (previous) => {
        const current = previous ?? [];
        return current.filter((item) => item.product !== productId);
      });
    },
  });
}
