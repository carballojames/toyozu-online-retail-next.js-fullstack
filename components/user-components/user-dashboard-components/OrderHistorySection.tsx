"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OrderStatus =
  | "Pending"
  | "Prepare to ship"
  | "Pickup by courier"
  | "Tracking number posted"
  | "In Transit"
  | "Delivered";

type OrderItem = {
  name: string;
  quantity: number;
  subtotal: number;
};

type Order = {
  id: string;
  date: string;
  status: OrderStatus;
  total: number;
  trackingNumber?: string;
  courier?: string;
  addressText?: string;
  items: OrderItem[];
};

type OrderListRow = {
  id: string;
  saleId: number | null;
  deliveryId: number;
  date: string;
  status: string;
  total: number;
  trackingNumber: string | null;
  itemsCount: number;
};

type OrderDetail = {
  saleId: number | null;
  deliveryId: number;
  date: string;
  paymentType: string;
  status: string;
  trackingNumber: string | null;
  courier: string | null;
  addressText: string;
  totals: { shipping: number; total: number };
  items: Array<{ name: string; quantity: number; subtotal: number }>;
  history: Array<{ id: string; at: string | null; status: string; sequence: number; location: string | null }>;
};

function coerceStatus(statusName: string | null | undefined): OrderStatus {
  const s = (statusName ?? "").trim();
  if (s === "Prepare to ship") return "Prepare to ship";
  if (s === "Pickup by courier") return "Pickup by courier";
  if (s === "Tracking number posted") return "Tracking number posted";
  if (s === "In Transit") return "In Transit";
  if (s === "Delivered") return "Delivered";
  return "Pending";
}

function statusBadgeVariant(status: OrderStatus): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "Delivered") return "secondary";
  if (status === "In Transit" || status === "Pickup by courier" || status === "Tracking number posted") return "primary";
  return "default";
}

type Props = {
  userId?: string | number;
  mode?: "all" | "tracking" | "history";
};

type SortOption = "date-desc" | "date-asc" | "total-desc" | "total-asc";

export default function OrderHistorySection({ userId, mode = "all" }: Props) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<OrderListRow[]>([]);
  const [detailsById, setDetailsById] = useState<Record<string, OrderDetail | undefined>>({});

  useEffect(() => {
    let cancelled = false;
    if (userId === undefined || userId === null || String(userId).trim() === "") return;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/me/orders?userId=${encodeURIComponent(String(userId))}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const json = (await res.json()) as { data?: OrderListRow[]; error?: string };
        if (!res.ok || !Array.isArray(json.data)) {
          throw new Error(json.error || "Failed to load orders");
        }

        if (cancelled) return;
        setRows(json.data);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load orders");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const orders: Order[] = useMemo(() => {
    return rows.map((r) => {
      const det = detailsById[String(r.saleId ?? r.id)];
      const status = coerceStatus(r.status);
      return {
        id: String(r.saleId ?? r.id),
        date: r.date,
        status,
        total: Number(r.total ?? 0),
        trackingNumber: r.trackingNumber ?? undefined,
        courier: det?.courier ?? undefined,
        addressText: det?.addressText ?? undefined,
        items: det?.items ?? [],
      };
    });
  }, [detailsById, rows]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (mode === "history" && o.status !== "Delivered") return false;
      if (mode === "tracking" && o.status === "Delivered") return false;
      if (mode === "all" && statusFilter !== "All" && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.trackingNumber?.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [mode, orders, query, statusFilter]);

  const sortedOrders = useMemo(() => {
    const next = [...filteredOrders];
    const toDate = (value: string) => {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    next.sort((a, b) => {
      if (sortBy === "date-asc") return toDate(a.date) - toDate(b.date);
      if (sortBy === "date-desc") return toDate(b.date) - toDate(a.date);
      if (sortBy === "total-asc") return a.total - b.total;
      return b.total - a.total;
    });
    return next;
  }, [filteredOrders, sortBy]);

  const openDetails = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDialogOpen(true);
    if (detailsById[orderId]) return;
    if (userId === undefined || userId === null) return;

    try {
      const res = await fetch(
        `/api/me/orders/${encodeURIComponent(orderId)}?userId=${encodeURIComponent(String(userId))}`,
        { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" },
      );
      const json = (await res.json()) as { data?: OrderDetail; error?: string };
      if (!res.ok || !json.data) throw new Error(json.error || "Failed to load order");
      setDetailsById((prev) => ({ ...prev, [orderId]: json.data }));
    } catch {
      // Keep silent; list stays visible.
    }
  };

  const showRateColumn = mode === "history";
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );
  const selectedDetail = selectedOrderId ? detailsById[selectedOrderId] : undefined;

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-lg border overflow-hidden mt-8">
        <div className="p-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium text-foreground">
            {mode === "history" ? "Delivered Orders" : "Orders"}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {mode === "all" && (
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "All")}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Orders</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Prepare to ship">Prepare to ship</SelectItem>
                  <SelectItem value="Pickup by courier">Pickup by courier</SelectItem>
                  <SelectItem value="Tracking number posted">Tracking number posted</SelectItem>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            )}

            {(mode === "history" || mode === "tracking") && (
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-44 bg-primary-foreground">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest first</SelectItem>
                  <SelectItem value="date-asc">Oldest first</SelectItem>
                  <SelectItem value="total-desc">Highest total</SelectItem>
                  <SelectItem value="total-asc">Lowest total</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "tracking" ? "Tracking number or product name" : "Search orders..."}
              className="w-[220px] bg-primary-foreground"
            />
            {mode === "tracking" && (
              <Button onClick={() => window.alert("Tracking is demo-only.")}>Track & Find</Button>
            )}
          </div>
        </div>

        <div className="max-h-112 overflow-y-auto">
          {error ? (
            <div className="py-10 text-center text-sm text-destructive">{error}</div>
          ) : isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading orders…</div>
          ) : sortedOrders.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No orders found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  {showRateColumn && <TableHead className="text-right">Rate</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.map((order) => {
                  const detail = detailsById[order.id];
                  return (
                    <React.Fragment key={order.id}>
                      <TableRow onClick={() => void openDetails(order.id)} className="cursor-pointer hover:bg-muted/40">
                        <TableCell className="font-medium text-foreground">{order.id}</TableCell>
                        <TableCell className="text-muted-foreground">{order.date}</TableCell>
                        <TableCell className="text-muted-foreground">{order.trackingNumber ?? "—"}</TableCell>
                        <TableCell className="text-foreground">{detail?.items?.length ?? "—"}</TableCell>
                        <TableCell className="text-foreground">₱{order.total.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(order.status)}>{order.status}</Badge>
                        </TableCell>
                        {showRateColumn && (
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.alert("Rate product flow is demo-only.");
                              }}
                            >
                              Rate Product
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {!selectedOrder ? (
            <div className="text-sm text-muted-foreground">Select an order to view details.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Order:</span> {selectedOrder.id}
                <span>•</span>
                <span className="font-medium text-foreground">Date:</span> {selectedOrder.date}
                <span>•</span>
                <span className="font-medium text-foreground">Total:</span> ₱{selectedOrder.total.toLocaleString()}
                <span>•</span>
                <Badge variant={statusBadgeVariant(selectedOrder.status)}>{selectedOrder.status}</Badge>
              </div>

              <div>
                <div className="font-semibold text-foreground mb-2">Products Ordered</div>
                {!selectedDetail ? (
                  <div className="text-sm text-muted-foreground">Loading details…</div>
                ) : selectedDetail.items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No items found.</div>
                ) : (
                  <div className="space-y-2">
                    {selectedDetail.items.map((item, idx) => (
                      <div key={`${selectedOrder.id}_${idx}`} className="flex justify-between text-sm">
                        <div className="text-foreground">
                          {item.name} <span className="text-muted-foreground">x {item.quantity}</span>
                        </div>
                        <div className="text-foreground">₱{item.subtotal.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="font-semibold text-foreground mb-2">Delivery Details</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium text-foreground">Courier:</span> {selectedDetail?.courier ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Tracking #:</span> {selectedDetail?.trackingNumber ?? selectedOrder.trackingNumber ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Address:</span> {selectedDetail?.addressText ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
