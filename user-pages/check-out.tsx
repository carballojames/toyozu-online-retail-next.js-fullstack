"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "../app/common/Header";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const FALLBACK_ADDRESSES: Address[] = [
  { id: "addr-1", label: "Demo Address", lines: ["Demo Address"] },
];

const FALLBACK_COURIERS: Courier[] = [
  {
    id: "courier-1",
    name: "Standard Courier",
    eta: "",
    base_rate: 120,
    rate_per_kg: 30,
    max_weight: null,
  },
];

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
  const [addresses, setAddresses] = useState<Address[]>(FALLBACK_ADDRESSES);
  const [couriers, setCouriers] = useState<Courier[]>(FALLBACK_COURIERS);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(FALLBACK_ADDRESSES[0]?.id ?? "");
  const [selectedCourierId, setSelectedCourierId] = useState<string>(FALLBACK_COURIERS[0]?.id ?? "");
  const [notes, setNotes] = useState<string>("");
  const [weightsKg, setWeightsKg] = useState<Record<string, number>>({});
  const [shippingError, setShippingError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
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

    const userId = readUserIdFromStorage();
    if (!userId) {
      setAddresses(FALLBACK_ADDRESSES);
      setCouriers(FALLBACK_COURIERS);
      setSelectedAddressId((prev) => prev || FALLBACK_ADDRESSES[0]?.id || "");
      setSelectedCourierId((prev) => prev || FALLBACK_COURIERS[0]?.id || "");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/checkout/lookups?userId=${userId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load checkout lookups");
        const json = (await res.json()) as {
          data?: { couriers?: Courier[]; addresses?: Address[] };
        };

        const nextAddresses = json.data?.addresses?.length ? json.data.addresses : FALLBACK_ADDRESSES;
        const nextCouriers = json.data?.couriers?.length ? json.data.couriers : FALLBACK_COURIERS;

        if (cancelled) return;
        setAddresses(nextAddresses);
        setCouriers(nextCouriers);
        setSelectedAddressId((prev) => prev || nextAddresses[0]?.id || "");
        setSelectedCourierId((prev) => prev || nextCouriers[0]?.id || "");
      } catch {
        if (cancelled) return;
        setAddresses(FALLBACK_ADDRESSES);
        setCouriers(FALLBACK_COURIERS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handlePlaceOrder = () => {
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

    window.alert(
      `Order placed (demo only).\n\nItems: ${items.length}\nPayment: CASH ON DELIVERY\nTotal: ₱${total.toLocaleString()}`
    );

    localStorage.removeItem(CHECKOUT_STORAGE_KEY);
    router.push("/user-dashboard");
  };

  const hasItems = items.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 pb-12 mt-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
            <p className="text-sm text-muted-foreground">Demo only • No backend calls</p>
          </div>
          <Badge variant="secondary">Light mode</Badge>
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
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h2 className="text-xl font-semibold text-foreground">Order Items</h2>
                </div>
                <div className="p-4">
                  <Table>
                    <TableHeader>
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
                          <TableCell className="whitespace-normal">
                            <div className="flex items-center gap-3">
                              <img
                                src={it.product_image || "/placeholder.svg"}
                                alt={it.product_name}
                                className="h-12 w-12 rounded-md border border-border object-cover"
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-foreground line-clamp-1">{it.product_name}</div>
                                <div className="text-xs text-muted-foreground">ID: {it.product}</div>
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

              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Delivery</h3>
                  <p className="text-sm text-muted-foreground">Select delivery address and courier. Payment is Cash on Delivery for now.</p>
                </div>

                {shippingError ? (
                  <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-3">
                    {shippingError}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Address</div>
                    <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select address" />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      {(addresses.find((a) => a.id === selectedAddressId)?.lines ?? []).join(" • ")}
                    </div>
                  </div>

                  <div className="space-y-2">
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
                    <div className="text-xs text-muted-foreground">
                      {selectedCourier
                        ? [
                            selectedCourier.eta,
                            `Base: ₱${selectedCourier.base_rate.toLocaleString()} (≤ 1kg)`,
                            `+ ₱${selectedCourier.rate_per_kg.toLocaleString()}/kg after`,
                          ]
                            .filter(Boolean)
                            .join(" • ")
                        : ""}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Payment method</div>
                    <div className="text-sm text-muted-foreground">Cash on Delivery</div>
                    <div className="text-xs text-muted-foreground">
                      Total weight: {totalWeightKg.toFixed(2)} kg (min fee starts at {MIN_FEE_WEIGHT_KG} kg)
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Notes (optional)</div>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Call upon arrival" />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:sticky lg:top-24 lg:h-fit">
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
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

                <Button className="w-full" onClick={handlePlaceOrder}>
                  Place Order
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