"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Header from "@/app/common/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useCartQuery,
  useDeleteCartItemMutation,
  useUpdateCartQuantityMutation,
} from "@/hooks/cart/use-cart";

import { Trash2 } from "lucide-react";

type ProductId = string;

type SelectedMap = Record<ProductId, boolean>;
type QuantityMap = Record<ProductId, number>;

const CHECKOUT_STORAGE_KEY = "checkoutData";
const EMPTY_CART_ITEMS: Array<{
  product: ProductId;
  product_name: string;
  product_image?: string;
  brand_name?: string;
  category_name?: string;
  selling_price: number;
  quantity: number;
  price_at_addition?: number;
}> = [];

function normalizeImageSrc(src: string | undefined): string {
  const trimmed = (src ?? "").trim();
  if (!trimmed) return "/placeholder.svg";
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return "/placeholder.svg";
}

function isRemoteImageSrc(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

export default function ShoppingCart() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedFromQuery = searchParams?.get("select");

  const { data: cartItems = EMPTY_CART_ITEMS, error: cartQueryError } = useCartQuery();
  const updateQuantityMutation = useUpdateCartQuantityMutation();
  const deleteItemMutation = useDeleteCartItemMutation();

  const [selectedItems, setSelectedItems] = useState<SelectedMap>({});
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [sort, setSort] = useState("default");
  const [search, setSearch] = useState("");

  const cartError = cartQueryError instanceof Error ? cartQueryError.message : null;

  useEffect(() => {
    setSelectedItems((previous) => {
      const next: SelectedMap = {};
      for (const item of cartItems) {
        next[item.product] = previous[item.product] ?? false;
      }
      const previousKeys = Object.keys(previous);
      const nextKeys = Object.keys(next);
      if (previousKeys.length === nextKeys.length && nextKeys.every((key) => previous[key] === next[key])) {
        return previous;
      }
      return next;
    });

    setQuantities((previous) => {
      const next: QuantityMap = {};
      for (const item of cartItems) {
        next[item.product] = previous[item.product] ?? item.quantity;
      }
      const previousKeys = Object.keys(previous);
      const nextKeys = Object.keys(next);
      if (previousKeys.length === nextKeys.length && nextKeys.every((key) => previous[key] === next[key])) {
        return previous;
      }
      return next;
    });
  }, [cartItems]);

  useEffect(() => {
    const productId = (selectedFromQuery ?? "").trim();
    if (!productId) return;
    if (!cartItems.some((item) => String(item.product) === productId)) return;

    const nextSelected: SelectedMap = {};
    for (const item of cartItems) {
      nextSelected[item.product] = String(item.product) === productId;
    }
    setSelectedItems(nextSelected);
  }, [cartItems, selectedFromQuery]);

  const toggleSelection = (productId: ProductId) => {
    setSelectedItems((previous) => ({
      ...previous,
      [productId]: !previous[productId],
    }));
  };

  const updateQuantity = (productId: ProductId, change: number) => {
    setQuantities((previous) => {
      const nextQuantity = Math.max(1, (previous[productId] ?? 1) + change);
      updateQuantityMutation.mutate({ productId, quantity: nextQuantity });

      return { ...previous, [productId]: nextQuantity };
    });
  };

  const toggleSelectAll = () => {
    const allSelected = cartItems.length > 0 && cartItems.every((item) => selectedItems[item.product]);
    const nextSelection: SelectedMap = {};
    for (const item of cartItems) {
      nextSelection[item.product] = !allSelected;
    }
    setSelectedItems(nextSelection);
  };

  const deleteProducts = (productIds: ProductId[]) => {
    if (productIds.length === 0) return;

    for (const productId of productIds) {
      deleteItemMutation.mutate({ productId });
    }

    setSelectedItems((previous) => {
      const next = { ...previous };
      for (const productId of productIds) {
        delete next[productId];
      }
      return next;
    });

    setQuantities((previous) => {
      const next = { ...previous };
      for (const productId of productIds) {
        delete next[productId];
      }
      return next;
    });
  };

  const handleDelete = (productId: ProductId) => {
    if (!window.confirm("Remove this item?")) return;
    deleteProducts([productId]);
  };

  const handleDeleteSelected = () => {
    const selectedProducts = cartItems
      .filter((item) => selectedItems[item.product])
      .map((item) => item.product);

    if (selectedProducts.length === 0) return;
    if (!window.confirm("Delete selected items?")) return;

    deleteProducts(selectedProducts);
  };

  const selectedTotal = useMemo(() => {
    return cartItems
      .filter((item) => selectedItems[item.product])
      .reduce(
        (sum, item) => sum + item.selling_price * (quantities[item.product] ?? item.quantity ?? 1),
        0,
      );
  }, [cartItems, quantities, selectedItems]);

  const selectedCount = useMemo(
    () => Object.values(selectedItems).filter(Boolean).length,
    [selectedItems],
  );

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
      window.alert("Select at least one item to checkout.");
      return;
    }

    const checkoutData = {
      items,
      subtotal: items.reduce((sum, item) => sum + item.selling_price * item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.selling_price * item.quantity, 0),
    };

    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(checkoutData));
    router.push("/checkout");
  };

  const sortedCartItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? cartItems.filter(
          (item) =>
            item.product_name.toLowerCase().includes(q) ||
            (item.brand_name ?? "").toLowerCase().includes(q) ||
            (item.category_name ?? "").toLowerCase().includes(q),
        )
      : cartItems;

    if (sort === "name") {
      return [...filtered].sort((a, b) => a.product_name.localeCompare(b.product_name));
    }
    if (sort === "priceLowHigh") {
      return [...filtered].sort((a, b) => a.selling_price - b.selling_price);
    }
    if (sort === "priceHighLow") {
      return [...filtered].sort((a, b) => b.selling_price - a.selling_price);
    }
    return filtered;
  }, [cartItems, sort, search]);

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <div className="mt-8 w-full px-85">
        {cartError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {cartError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-3xl font-medium text-primary">
            <span>Shopping Cart</span>
          </h1>

          <div className="mt-3 sm:mt-0 flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-60">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="w-full sm:w-[180px]">
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
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
          <div className="bg-background text-surface-foreground rounded-xl shadow-sm border border-border">
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="text-muted-foreground uppercase tracking-wide text-xs">
                    <TableHead className="w-[520px]">Product</TableHead>
                    <TableHead>Category / Brand</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-14"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCartItems.map((item) => {
                    const imageSrc = normalizeImageSrc(item.product_image);
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
                            <Image
                              src={imageSrc}
                              alt={item.product_name || "Product image"}
                              width={80}
                              height={80}
                              className="w-20 h-20 object-cover"
                              unoptimized={isRemoteImageSrc(imageSrc)}
                            />
                            <div className="min-w-0 flex-1 max-w-[220px]">
                              <div
                                className="font-medium text-foreground leading-5"
                                style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  wordBreak: "break-word",
                                }}
                              >
                                {item.product_name}
                              </div>
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
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 border border-border"
                            >
                              −
                            </Button>
                            <span className="w-8 text-center font-medium">{quantity}</span>
                            <Button
                              onClick={() => updateQuantity(item.product, 1)}
                              variant="default"
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
                            <Trash2 className="h-8 w-8" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y lg:hidden">
              {sortedCartItems.map((item) => {
                const imageSrc = normalizeImageSrc(item.product_image);
                const quantity = quantities[item.product] ?? item.quantity ?? 1;
                const subtotal = (Number(item.selling_price) * quantity).toFixed(2);

                return (
                  <div key={item.product} className="p-3 hover:bg-background transition">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 pt-1 flex items-center justify-center my-auto">
                        <input
                          type="checkbox"
                          checked={!!selectedItems[item.product]}
                          onChange={() => toggleSelection(item.product)}
                          className="w-5 h-5"
                        />
                      </div>

                      <div className="flex-1 relative bg-background rounded-lg p-3">
                        <div className="absolute top-2 right-2">
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

                        <div className="flex items-start gap-3">
                          <Image
                            src={imageSrc}
                            alt={item.product_name || "Product image"}
                            width={80}
                            height={80}
                            className="w-20 max-h-20 object-cover shrink-0"
                            unoptimized={isRemoteImageSrc(imageSrc)}
                          />

                          <div className="min-w-0 flex-1 max-w-[190px]">
                            <div
                              className="font-medium text-foreground text-sm leading-5"
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                wordBreak: "break-word",
                              }}
                            >
                              {item.product_name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {item.category_name || "Category"} › {item.brand_name || "Brand"}
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <div className="text-left font-semibold text-primary">₱{subtotal}</div>

                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => updateQuantity(item.product, -1)}
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 border border-border"
                                >
                                  −
                                </Button>
                                <span className="w-8 text-center font-medium text-sm">{quantity}</span>
                                <Button
                                  onClick={() => updateQuantity(item.product, 1)}
                                  variant="default"
                                  size="icon"
                                  className="h-6 w-6"
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-background rounded-b-xl">
              <input
                type="checkbox"
                checked={cartItems.length > 0 && cartItems.every((item) => selectedItems[item.product])}
                onChange={toggleSelectAll}
                className="w-5 h-5"
              />
              <span className="text-sm text-muted-foreground font-medium">Select All</span>

              <Button
                onClick={handleDeleteSelected}
                disabled={selectedCount === 0}
                variant="destructive"
                className="ml-2"
              >
                Delete Selected
              </Button>
            </div>
          </div>

          <div className="hidden lg:block h-fit w-fit lg:sticky lg:top-6">
            <div className="bg-background text-surface-foreground rounded-xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Order Summary</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal ({selectedCount} items)</span>
                  <span>₱{selectedTotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground">
                  <span>Total Payable</span>
                  <span className="text-primary">₱{selectedTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button onClick={handleProceedToCheckout} className="w-full" variant="default">
                PROCEED TO CHECKOUT
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3">
          <div className="max-w-[1500px] mx-auto px-4">
            <div className="bg-background border-t border-border rounded-t-xl shadow-lg p-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Subtotal ({selectedCount} items)</div>
                <div className="font-semibold text-foreground">₱{selectedTotal.toFixed(2)}</div>
              </div>
              <div className="w-40">
                <Button onClick={handleProceedToCheckout} className="w-full">
                  Checkout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
