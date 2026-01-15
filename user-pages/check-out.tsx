"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "../app/common/Header";


import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CheckoutItem = {
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

type Address = {
  id: string;
  label: string;
  lines: string[];
};

type Courier = {
  id: string;
  name: string;
  eta: string;
  base_rate: number;
  rate_per_kg: number;
  max_weight: number | null;
};

const CHECKOUT_STORAGE_KEY = "checkoutData";

const MIN_FEE_WEIGHT_KG = 0.1; // 100 grams
const MIN_FEE_MAX_WEIGHT_KG = 1; // up to 1kg is min fee

// Removed fallback addresses/couriers to surface real DB lookup issues to the user.

function readUserIdFromStorage(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("user_id");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function calculateShippingFee(totalWeightKgRaw: number, courier: Courier | null): number {
  if (!courier) return 0;
  const totalWeightKg = Math.max(0, totalWeightKgRaw);
  const chargeableWeightKg = Math.max(MIN_FEE_WEIGHT_KG, totalWeightKg);

  if (courier.max_weight !== null && chargeableWeightKg > courier.max_weight) {
    return Number.POSITIVE_INFINITY;
  }

  const baseFee = Math.max(0, courier.base_rate);
  const perKg = Math.max(0, courier.rate_per_kg);

  if (chargeableWeightKg <= MIN_FEE_MAX_WEIGHT_KG) return baseFee;

  const extraKg = chargeableWeightKg - MIN_FEE_MAX_WEIGHT_KG;
  const extraUnits = Math.ceil(extraKg);
  return baseFee + extraUnits * perKg;
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeCheckoutItems(value: unknown): CheckoutItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const item = raw as Partial<CheckoutItem>;
      if (!item.product || !item.product_name) return null;

      const sellingPrice = Number(item.selling_price);
      const quantity = Number(item.quantity);
      if (!Number.isFinite(sellingPrice) || sellingPrice < 0) return null;
      if (!Number.isFinite(quantity) || quantity <= 0) return null;

      const normalized: CheckoutItem = {
        product: String(item.product),
        product_name: String(item.product_name),
        product_image: item.product_image ? String(item.product_image) : undefined,
        brand_name: item.brand_name ? String(item.brand_name) : undefined,
        category_name: item.category_name ? String(item.category_name) : undefined,
        selling_price: sellingPrice,
        quantity: Math.max(1, Math.floor(quantity)),
      };
      return normalized;
    })
    .filter((x): x is CheckoutItem => x !== null);
}

export default function CheckoutPage() {
  const router = useRouter();

  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [weightsKg, setWeightsKg] = useState<Record<string, number>>({});
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUserId(readUserIdFromStorage());
    const parsed = safeParseJson<unknown>(localStorage.getItem(CHECKOUT_STORAGE_KEY));
    if (!parsed || typeof parsed !== "object") {
      setItems([]);
      return;
    }
    const rawItems = (parsed as Partial<CheckoutData>).items;
    setItems(normalizeCheckoutItems(rawItems));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchLookups = async () => {
      setLookupLoading(true);
      try {
        const nextUserId = readUserIdFromStorage();
        setUserId(nextUserId);
        const url = nextUserId ? `/api/checkout/lookups?userId=${nextUserId}` : "/api/checkout/lookups";
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | { data?: { couriers?: Courier[]; addresses?: Address[] }; error?: string }
          | null;
        if (!res.ok) {
          throw new Error(json?.error || `Failed to load checkout lookups (${res.status})`);
        }

        const nextCouriers = json?.data?.couriers?.length ? json.data.couriers : [];
        const nextAddresses = nextUserId
          ? json?.data?.addresses?.length
            ? json.data.addresses
            : []
          : [];

        if (cancelled) return;
        setCouriers(nextCouriers);
        setAddresses(nextAddresses);
        setSelectedCourierId((prev) => prev || nextCouriers[0]?.id || "");
        setSelectedAddressId((prev) => prev || nextAddresses[0]?.id || "");

        setLookupError(null);
      } catch (e) {
        if (cancelled) return;
        setAddresses([]);
        setCouriers([]);
        setLookupError(e instanceof Error ? e.message : "Unable to load checkout lookups.");
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    };

    fetchLookups();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetryLookups = async () => {
    setLookupError(null);
    setLookupLoading(true);
    try {
      const nextUserId = readUserIdFromStorage();
      setUserId(nextUserId);
      const url = nextUserId ? `/api/checkout/lookups?userId=${nextUserId}` : "/api/checkout/lookups";
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | { data?: { couriers?: Courier[]; addresses?: Address[] }; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(json?.error || `Failed to load checkout lookups (${res.status})`);
      }

      const nextCouriers = json?.data?.couriers?.length ? json.data.couriers : [];
      const nextAddresses = nextUserId
        ? json?.data?.addresses?.length
          ? json.data.addresses
          : []
        : [];

      setCouriers(nextCouriers);
      setAddresses(nextAddresses);
      setSelectedCourierId((prev) => prev || nextCouriers[0]?.id || "");
      setSelectedAddressId((prev) => prev || nextAddresses[0]?.id || "");

      setLookupError(null);
    } catch (e) {
      setAddresses([]);
      setCouriers([]);
      setLookupError(e instanceof Error ? e.message : "Unable to load checkout lookups.");
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setShippingError(null);

    const ids = items
      .map((it) => Number(it.product))
      .filter((n) => Number.isFinite(n) && n > 0)
      .map((n) => Math.floor(n));

    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      setWeightsKg({});
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/products/weights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: uniqueIds }),
        });

        if (!res.ok) throw new Error("Failed to load weights");
        const json = (await res.json()) as { data?: { weightsKg?: Record<string, number> } };
        const next = json.data?.weightsKg ?? {};
        if (cancelled) return;
        setWeightsKg(next);
      } catch {
        if (cancelled) return;
        setWeightsKg({});
        setShippingError("Unable to load product weights. Shipping fee may be inaccurate.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const selectedCourier = useMemo(
    () => couriers.find((c) => c.id === selectedCourierId) ?? null,
    [couriers, selectedCourierId]
  );

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + it.selling_price * it.quantity, 0);
  }, [items]);

  const totalWeightKg = useMemo(() => {
    return items.reduce((sum, it) => {
      const perItemKg = Number(weightsKg[it.product] ?? 0);
      const qty = Number(it.quantity ?? 0);
      if (!Number.isFinite(perItemKg) || perItemKg < 0) return sum;
      if (!Number.isFinite(qty) || qty <= 0) return sum;
      return sum + perItemKg * qty;
    }, 0);
  }, [items, weightsKg]);

  const shippingCost = useMemo(() => {
    const fee = calculateShippingFee(totalWeightKg, selectedCourier);
    return Number.isFinite(fee) ? fee : 0;
  }, [selectedCourier, totalWeightKg]);

  const total = subtotal + shippingCost;

  const handlePlaceOrder = async () => {
    setPlaceOrderError(null);

    if (items.length === 0) {
      window.alert("No items selected for checkout.");
      return;
    }
    if (!selectedAddressId) {
      window.alert("Please select a delivery address.");
      return;
    }
    if (!selectedCourierId) {
      window.alert("Please select a courier.");
      return;
    }

    const userId = readUserIdFromStorage();
    if (!userId) {
      window.alert("Please sign in to place an order.");
      router.push("/login");
      return;
    }

    try {
      setPlacingOrder(true);
      const res = await fetch("/api/checkout/place", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          userId,
          addressId: selectedAddressId,
          courierId: selectedCourierId,
          paymentType: "CASH_ON_DELIVERY",
          items: items.map((it) => ({ productId: it.product, quantity: it.quantity })),
        }),
      });

      const json = (await res.json()) as {
        data?: { saleId?: number; total?: number };
        error?: string;
      };

      if (!res.ok || !json.data?.saleId) {
        throw new Error(json.error || "Failed to place order");
      }

      localStorage.removeItem(CHECKOUT_STORAGE_KEY);
      window.alert(
        `Order placed!\n\nOrder ID: ${json.data.saleId}\nPayment: CASH ON DELIVERY\nTotal: ₱${Number(json.data.total ?? total).toLocaleString()}`,
      );

      router.push("/user/orders");
    } catch (e) {
      setPlaceOrderError(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setPlacingOrder(false);
    }
  };

  const hasItems = items.length > 0;

  return (
    <div className="min-h-screen bg-primary-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 pb-12 mt-8">
        {lookupError ? (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 flex items-center justify-between">
            <div className="text-sm text-destructive">{lookupError}</div>
            <div className="flex items-center gap-2">
              <button
                className="text-sm underline text-destructive"
                onClick={handleRetryLookups}
                disabled={lookupLoading}
              >
                {lookupLoading ? "Retrying…" : "Retry"}
              </button>
            </div>
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-secondary">Checkout</h1>
          </div>
        </div>

        {!hasItems ? (
          <div className="mt-8 bg-card border border-border rounded-xl p-6">
            <div className="text-center space-y-3">
              <p className="text-foreground font-semibold">No items selected for checkout.</p>
              <p className="text-sm text-muted-foreground">Go back to your cart and select items to continue.</p>
              <Button onClick={() => router.push("/cart")}>Go to cart</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface rounded-2xl border border-border overflow-hidden">

                <div className="">
                  <Table>
                    <TableHeader className="h-16 text-md font-semibold">
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category / Brand</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it) => (
                        <TableRow key={it.product}>
                          <TableCell className="whitespace-normal h-20">
                            <div className="flex items-center gap-3">
                              <img
                                src={it.product_image || "/placeholder.svg"}
                                alt={it.product_name}
                                className="h-12 w-12  object-cover"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground line-clamp-1 text-md">{it.product_name}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-normal text-muted-foreground">
                            {[it.category_name, it.brand_name].filter(Boolean).join(" • ") || "—"}
                          </TableCell>
                          <TableCell className="text-right text-foreground">{it.quantity}</TableCell>
                          <TableCell className="text-right text-foreground">₱{it.selling_price.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">
                            ₱{(it.selling_price * it.quantity).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-border p-6 space-y-5 w-full">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Delivery</h3>
                  <p className="text-sm text-muted-foreground">Select delivery address and courier. Payment is Cash on Delivery for now.</p>
                </div>

                {shippingError ? (
                  <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-3">
                    {shippingError}
                  </div>
                ) : null}

                <div className="">
                  <div className="space-y-2 lg:col-span-1">
                    <div className="text-sm font-medium text-foreground">Address</div>
                    <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                      <SelectTrigger className="max-w-full">
                        <SelectValue placeholder="Select address" />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((a) => (
                          <SelectItem key={a.id} value={a.id} className="max-w-full">
                            <span className="block break-words whitespace-normal line-clamp-2" title={a.label}>
                              {a.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {addresses.length === 0 ? (
                      <div className="text-sm text-muted-foreground mt-2">
                        {userId
                          ? lookupError
                            ? "Unable to load delivery addresses right now."
                            : "No saved addresses yet. Add one in your account."
                          : "Sign in to load your delivery addresses."}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2 flex flex-row justify-evenly  lg:gap-6 mt-4 ">
                    <div className="flex flex-col justify-start space-y-1 lg:col-span-1 w-full">
                      <div className="text-sm font-medium text-foreground">Courier</div>
                      <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select courier" />
                        </SelectTrigger>
                        <SelectContent>
                          {couriers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {couriers.length === 0 ? (
                        <div className="text-sm text-destructive mt-2">
                          {lookupError ? "Unable to load couriers right now." : "No couriers available right now."}
                        </div>
                      ) : null}
                    </div>  

                    <div className="space-y-1 lg:col-span-1 w-full">
                      <div className="text-sm font-medium text-foreground">Payment</div>
                      <div className="text-sm text-muted-foreground">Cash on Delivery</div>
                      <div className="text-xs text-muted-foreground">Total weight: {totalWeightKg.toFixed(2)} kg</div>
                    </div>
                  </div>

                </div>

                {placeOrderError ? (
                  <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-3">
                    {placeOrderError}
                  </div>
                ) : null}

              </div>
            </div>

            <div className="lg:sticky lg:top-24 lg:h-fit">
              <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Order Summary</h2>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">₱{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-foreground">₱{shippingCost.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-semibold text-foreground">₱{total.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || couriers.length === 0 || !userId || addresses.length === 0}
                >
                  {placingOrder ? "Placing…" : "Place Order"}
                </Button>

                <p className="text-xs text-muted-foreground">
                  By placing this order, you agree to our Terms & Conditions (demo text).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}