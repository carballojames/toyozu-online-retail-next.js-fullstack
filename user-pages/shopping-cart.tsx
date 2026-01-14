"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../app/common/Header";
import { Button } from "@/components/ui/button";
import { Trash2 }from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProductId = string;

interface CartItem {
  product: ProductId;
  product_name: string;
  product_image?: string;
  brand_name?: string;
  category_name?: string;
  selling_price: number;
  quantity: number;
  price_at_addition?: number;
}

type SelectedMap = Record<ProductId, boolean>;
type QuantityMap = Record<ProductId, number>;

const CART_STORAGE_KEY = "cartItems";
const CHECKOUT_STORAGE_KEY = "checkoutData";

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParseJson<unknown>(localStorage.getItem(CART_STORAGE_KEY));
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((raw) => {
      const item = raw as Partial<CartItem>;
      if (!item.product || !item.product_name) return null;
      const sellingPrice = Number(item.selling_price);
      const quantity = Number(item.quantity);
      if (!Number.isFinite(sellingPrice) || !Number.isFinite(quantity)) return null;
      const normalized: CartItem = {
        product: String(item.product),
        product_name: String(item.product_name),
        product_image: item.product_image ? String(item.product_image) : undefined,
        brand_name: item.brand_name ? String(item.brand_name) : undefined,
        category_name: item.category_name ? String(item.category_name) : undefined,
        selling_price: sellingPrice,
        quantity: Math.max(1, quantity),
        price_at_addition:
          item.price_at_addition !== undefined ? Number(item.price_at_addition) : undefined,
      };
      return normalized;
    })
    .filter((x): x is CartItem => x !== null);
}

function writeCartToStorage(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart:updated"));
}

function readUserIdFromStorage(): number {
  if (typeof window === "undefined") return NaN;
  const raw = localStorage.getItem("user_id");
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

export default function ShoppingCart() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedMap>({});
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [sort, setSort] = useState("default");
  const [cartError, setCartError] = useState<string | null>(null);

  // Load cart from localStorage once
  useEffect(() => {
    const controller = new AbortController();
    const userId = readUserIdFromStorage();

    const initFromItems = (items: CartItem[]) => {
      setCartItems(items);
      const initSelected: SelectedMap = {};
      const initQuantities: QuantityMap = {};
      for (const item of items) {
        initSelected[item.product] = true;
        initQuantities[item.product] = item.quantity;
      }
      setSelectedItems(initSelected);
      setQuantities(initQuantities);
    };

    const load = async () => {
      setCartError(null);
      if (Number.isFinite(userId)) {
        try {
          const res = await fetch(`/api/cart?userId=${encodeURIComponent(String(userId))}`, {
            method: "GET",
            signal: controller.signal,
            headers: { Accept: "application/json" },
            cache: "no-store",
          });

          const json = (await res.json()) as { data?: { items: CartItem[] }; error?: string };
          if (!res.ok || !json.data) {
            throw new Error(json.error || "Failed to load cart");
          }

          initFromItems(json.data.items ?? []);
          return;
        } catch (e) {
          if ((e as { name?: string }).name === "AbortError") return;
          setCartError(e instanceof Error ? e.message : "Failed to load cart");
          // fall back to localStorage if API fails
        }
      }

      initFromItems(readCartFromStorage());
    };

    load();
    return () => controller.abort();
  }, []);

  const toggleSelection = (productId: ProductId) =>
    setSelectedItems((prev) => ({ ...prev, [productId]: !prev[productId] }));

  const updateQuantity = (productId: ProductId, change: number) => {
    const userId = readUserIdFromStorage();

    setQuantities((prev) => {
      const nextQty = Math.max(1, (prev[productId] ?? 1) + change);

      // Update UI immediately.
      setCartItems((prevItems) => {
        const nextItems = prevItems.map((it) =>
          it.product === productId ? { ...it, quantity: nextQty } : it,
        );
        if (!Number.isFinite(userId)) writeCartToStorage(nextItems);
        return nextItems;
      });

      // Persist to DB for logged-in user.
      if (Number.isFinite(userId)) {
        void fetch(`/api/cart/${encodeURIComponent(productId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ userId, quantity: nextQty }),
        }).catch(() => {
          // keep silent; UI already updated
        });
      }

      return { ...prev, [productId]: nextQty };
    });
  };

  const toggleSelectAll = () => {
    const allSelected = cartItems.length > 0 && cartItems.every((item) => selectedItems[item.product]);
    const newSelection: SelectedMap = {};
    for (const item of cartItems) {
      newSelection[item.product] = !allSelected;
    }
    setSelectedItems(newSelection);
  };

  const handleDelete = (productId: ProductId) => {
    if (!window.confirm("Remove this item?")) return;

    const userId = readUserIdFromStorage();
    if (Number.isFinite(userId)) {
      void fetch(`/api/cart/${encodeURIComponent(productId)}?userId=${encodeURIComponent(String(userId))}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      }).catch(() => {
        // ignore
      });
    }

    setCartItems((prev) => {
      const next = prev.filter((item) => item.product !== productId);
      if (!Number.isFinite(userId)) writeCartToStorage(next);
      return next;
    });
    setSelectedItems((prev) => {
      const { [productId]: _removed, ...rest } = prev;
      return rest;
    });
    setQuantities((prev) => {
      const { [productId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleDeleteSelected = () => {
    const selectedProducts = cartItems
      .filter((item) => selectedItems[item.product])
      .map((item) => item.product);

    if (selectedProducts.length === 0) return;
    if (!window.confirm("Delete selected items?")) return;

    selectedProducts.forEach((productId) => handleDelete(productId));
  };

  const selectedTotal = useMemo(() => {
    return cartItems
      .filter((item) => selectedItems[item.product])
      .reduce((sum, item) => sum + item.selling_price * (quantities[item.product] ?? item.quantity ?? 1), 0);
  }, [cartItems, quantities, selectedItems]);

  const handleProceedToCheckout = () => {
    const items = cartItems
      .filter((item) => selectedItems[item.product])
      .map((item) => ({
        product: item.product,
        product_name: item.product_name,
        product_image: item.product_image,
        brand_name: item.brand_name,
        category_name: item.category_name,
        selling_price: Number(item.selling_price),
        quantity: quantities[item.product] ?? item.quantity,
        price: Number(item.price_at_addition ?? item.selling_price),
      }));

    if (items.length === 0) {
      alert("Select at least one item to checkout.");
      return;
    }

    const checkoutData = {
      items,
      subtotal: items.reduce((s, it) => s + it.selling_price * it.quantity, 0),
      total: items.reduce((s, it) => s + it.selling_price * it.quantity, 0),
    };

    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(checkoutData));
    router.push("/checkout");
  };

  return (
    <div className="min-h-screen bg-primary-background">
      <Header />

      <div className="max-w-[1500px] mx-auto px-4 pb-12 mt-8">
        {cartError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {cartError}
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-3xl font-bold text-secondary">
            Products{" "}
            <span className="text-primary">
              ({cartItems.length > 0 ? cartItems.length : 0})
            </span>
          </h1>

          <div className="mt-3 sm:mt-0 w-full sm:w-[220px]">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Sort by</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="priceLowHigh">Price: Low → High</SelectItem>
                <SelectItem value="priceHighLow">Price: High → Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
          {/* Left Column */}
          <div className="bg-surface text-surface-foreground rounded-xl shadow-sm border border-border">
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="text-muted-foreground uppercase tracking-wide text-xs">
                    <TableHead className="w-[520px]">Product</TableHead>
                    <TableHead>Category / Brand</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-[56px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartItems.map((item) => {
                    const imageSrc = item.product_image || "/placeholder.svg";
                    const quantity = quantities[item.product] ?? item.quantity ?? 1;
                    const subtotal = (Number(item.selling_price) * quantity).toFixed(2);

                    return (
                      <TableRow key={item.product} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <input
                              type="checkbox"
                              checked={!!selectedItems[item.product]}
                              onChange={() => toggleSelection(item.product)}
                              className="w-4 h-4"
                            />
                            <img
                              src={imageSrc}
                              alt={item.product_name || "Product image"}
                              className="w-20 h-20 object-cover rounded-md border border-border"
                            />
                            <div>
                              <div className="font-medium text-foreground line-clamp-1">{item.product_name}</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {item.category_name || "Category"} › {item.brand_name || "Brand"}
                        </TableCell>

                        <TableCell className="text-right font-medium text-foreground">
                          ₱{Number(item.selling_price).toFixed(2)}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => updateQuantity(item.product, -1)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                            >
                              −
                            </Button>
                            <span className="w-8 text-center font-medium">{quantity}</span>
                            <Button
                              onClick={() => updateQuantity(item.product, 1)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-semibold text-primary">₱{subtotal}</TableCell>

                        <TableCell className="text-right">
                          <Button
                            onClick={() => handleDelete(item.product)}
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile List */}
            <div className="divide-y sm:hidden">
              {cartItems.map((item) => {
                const imageSrc = item.product_image || "/placeholder.svg";
                const quantity = quantities[item.product] ?? item.quantity ?? 1;
                const subtotal = (Number(item.selling_price) * quantity).toFixed(2);

                return (
                  <div key={item.product} className="p-4 hover:bg-muted/50 transition">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={!!selectedItems[item.product]}
                        onChange={() => toggleSelection(item.product)}
                        className="mt-1 w-4 h-4"
                      />
                      <img
                        src={imageSrc}
                        alt={item.product_name || "Product image"}
                        className="w-20 h-20 object-cover rounded-md border border-border"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground line-clamp-1">{item.product_name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.category_name || "Category"} › {item.brand_name || "Brand"}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-foreground font-medium">₱{Number(item.selling_price).toFixed(2)}</div>
                          <div className="text-right font-semibold text-primary">₱{subtotal}</div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => updateQuantity(item.product, -1)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                            >
                              −
                            </Button>
                            <span className="w-8 text-center font-medium">{quantity}</span>
                            <Button
                              onClick={() => updateQuantity(item.product, 1)}
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                            >
                              +
                            </Button>
                          </div>
                          <Button
                            onClick={() => handleDelete(item.product)}
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Controls */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-muted/30 rounded-b-xl">
              <input
                type="checkbox"
                checked={
                  cartItems.length > 0 &&
                  cartItems.every((item) => selectedItems[item.product])
                }
                onChange={toggleSelectAll}
                className="w-5 h-5"
              />
              <span className="text-sm text-muted-foreground font-medium">Select All</span>

              <Button
                onClick={handleDeleteSelected}
                disabled={
                  Object.values(selectedItems).filter(Boolean).length === 0
                }
                variant="destructive"
                className="ml-2"
              >
                Delete Selected
              </Button>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="h-fit w-fit lg:sticky lg:top-6">
            <div className="bg-surface text-surface-foreground rounded-xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">
                Order Summary
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    Subtotal ({Object.values(selectedItems).filter(Boolean).length}{" "}
                    items)
                  </span>
                  <span>₱{selectedTotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground">
                  <span>Total Payable</span>
                  <span className="text-primary">
                    ₱{selectedTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleProceedToCheckout}
                className="w-full" variant="default"
              >
                PROCEED TO CHECKOUT
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
