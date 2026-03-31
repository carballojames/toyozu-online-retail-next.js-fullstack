"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import Header from "@/app/common/Header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  readUserIdFromStorage,
  useCheckoutItemsQuery,
  useCheckoutLookupsQuery,
  usePlaceOrderMutation,
  useProductWeightsQuery,
} from "@/hooks/checkout/use-checkout";

import type { Address, CheckoutItem, Courier } from "@/hooks/checkout/use-checkout";

const CHECKOUT_STORAGE_KEY = "checkoutData";
const MIN_FEE_WEIGHT_KG = 0.1;
const MIN_FEE_MAX_WEIGHT_KG = 1;
const EMPTY_ADDRESSES: Address[] = [];
const EMPTY_COURIERS: Courier[] = [];

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

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: items = [] } = useCheckoutItemsQuery();
  const { data: lookups, error: lookupQueryError, isFetching: lookupLoading } = useCheckoutLookupsQuery();
  const { data: weightsKg = {}, error: weightsQueryError } = useProductWeightsQuery(items);
  const placeOrderMutation = usePlaceOrderMutation();

  const userId = lookups?.userId ?? null;
  const addresses = lookups?.addresses ?? EMPTY_ADDRESSES;
  const couriers = lookups?.couriers ?? EMPTY_COURIERS;

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null);

  const lookupError = lookupQueryError instanceof Error ? lookupQueryError.message : null;
  const shippingError =
    weightsQueryError instanceof Error ? "Unable to load product weights. Shipping fee may be inaccurate." : null;
  const placingOrder = placeOrderMutation.isPending;

  const handleRetryLookups = async () => {
    await queryClient.invalidateQueries({ queryKey: ["checkout-lookups"] });
  };

  const effectiveSelectedAddressId = useMemo(() => {
    if (selectedAddressId && addresses.some((address) => address.id === selectedAddressId)) {
      return selectedAddressId;
    }
    return addresses[0]?.id;
  }, [addresses, selectedAddressId]);

  const effectiveSelectedCourierId = useMemo(() => {
    if (selectedCourierId && couriers.some((courier) => courier.id === selectedCourierId)) {
      return selectedCourierId;
    }
    return couriers[0]?.id;
  }, [couriers, selectedCourierId]);

  const selectedCourier = useMemo(
    () => couriers.find((courier) => courier.id === effectiveSelectedCourierId) ?? null,
    [couriers, effectiveSelectedCourierId],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.selling_price * item.quantity, 0),
    [items],
  );

  const totalWeightKg = useMemo(() => {
    return items.reduce((sum, item) => {
      const perItemKg = Number(weightsKg[item.product] ?? 0);
      const qty = Number(item.quantity ?? 0);
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
    if (!effectiveSelectedAddressId) {
      window.alert("Please select a delivery address.");
      return;
    }
    if (!effectiveSelectedCourierId) {
      window.alert("Please select a courier.");
      return;
    }

    const uid = readUserIdFromStorage();
    if (!uid) {
      window.alert("Please sign in to place an order.");
      router.push("/auth/login");
      return;
    }

    try {
      const data = await placeOrderMutation.mutateAsync({
        userId: uid,
        addressId: effectiveSelectedAddressId,
        courierId: effectiveSelectedCourierId,
        paymentType: "CASH_ON_DELIVERY",
        items: items.map((item) => ({ productId: item.product, quantity: item.quantity })),
      });

      localStorage.removeItem(CHECKOUT_STORAGE_KEY);
      await queryClient.invalidateQueries({ queryKey: ["checkout-items"] });

      window.alert(
        `Order placed!\n\nOrder ID: ${data.saleId}\nPayment: CASH ON DELIVERY\nTotal: ₱${Number(data.total ?? total).toLocaleString()}`,
      );
      router.push("/user/orders");
    } catch (error) {
      setPlaceOrderError(error instanceof Error ? error.message : "Failed to place order");
    }
  };

  const hasItems = items.length > 0;

  return (
    <div className="min-h-screen bg-primary-background ">
      <Header />

      <div className="w-full px-85 pb-12 mt-8 ">
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
                      {items.map((item: CheckoutItem) => {
                        const imageSrc = normalizeImageSrc(item.product_image);
                        return (
                          <TableRow key={item.product}>
                            <TableCell className="whitespace-normal h-20">
                              <div className="flex items-center gap-3">
                                <Image
                                  src={imageSrc}
                                  alt={item.product_name}
                                  width={48}
                                  height={48}
                                  className="h-12 w-12 object-cover"
                                  unoptimized={isRemoteImageSrc(imageSrc)}
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-foreground line-clamp-1 text-md">
                                    {item.product_name}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-normal text-muted-foreground">
                              {[item.category_name, item.brand_name].filter(Boolean).join(" • ") || "—"}
                            </TableCell>
                            <TableCell className="text-right text-foreground">{item.quantity}</TableCell>
                            <TableCell className="text-right text-foreground">₱{item.selling_price.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium text-foreground">
                              ₱{(item.selling_price * item.quantity).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-border p-6 space-y-5 w-full">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Delivery</h3>
                  <p className="text-sm text-muted-foreground">
                    Select delivery address and courier. Payment is Cash on Delivery for now.
                  </p>
                </div>

                {shippingError ? (
                  <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-3">
                    {shippingError}
                  </div>
                ) : null}

                <div className="">
                  <div className="space-y-2 lg:col-span-1">
                    <div className="text-sm font-medium text-foreground">Address</div>
                    <Select value={effectiveSelectedAddressId} onValueChange={setSelectedAddressId}>
                      <SelectTrigger className="max-w-full">
                        <SelectValue placeholder="Select address" />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((address) => (
                          <SelectItem key={address.id} value={address.id} className="max-w-full">
                            <span className="block wrap-break-word whitespace-normal line-clamp-2" title={address.label}>
                              {address.label}
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
                      <Select value={effectiveSelectedCourierId} onValueChange={setSelectedCourierId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select courier" />
                        </SelectTrigger>
                        <SelectContent>
                          {couriers.map((courier) => (
                            <SelectItem key={courier.id} value={courier.id}>
                              {courier.name}
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

            <div className="lg:sticky lg:top-24 lg:h-fit w-[450px] md:w-full">
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
