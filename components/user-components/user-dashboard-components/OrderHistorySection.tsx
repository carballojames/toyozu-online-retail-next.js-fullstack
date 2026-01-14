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
};

export default function OrderHistorySection({ userId }: Props) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [query, setQuery] = useState("");
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
      if (statusFilter !== "All" && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.trackingNumber?.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [orders, query, statusFilter]);

  const onToggle = async (orderId: string) => {
    const next = expandedOrderId === orderId ? null : orderId;
    setExpandedOrderId(next);
    if (!next) return;
    if (detailsById[next]) return;
    if (userId === undefined || userId === null) return;

    try {
      const res = await fetch(
        `/api/me/orders/${encodeURIComponent(next)}?userId=${encodeURIComponent(String(userId))}`,
        { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" },
      );
      const json = (await res.json()) as { data?: OrderDetail; error?: string };
      if (!res.ok || !json.data) throw new Error(json.error || "Failed to load order");
      setDetailsById((prev) => ({ ...prev, [next]: json.data }));
    } catch {
      // Keep silent; list stays visible.
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-muted-foreground">{userId ? `User ${userId}` : "Sign in to view orders"}</div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "All")}>
            <SelectTrigger className="w-40">
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
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders..." className="w-[220px]" />
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="max-h-112 overflow-y-auto">
          {error ? (
            <div className="py-10 text-center text-sm text-destructive">{error}</div>
          ) : isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading orders…</div>
          ) : filteredOrders.length === 0 ? (
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const isOpen = expandedOrderId === order.id;
                  const detail = detailsById[order.id];
                  return (
                    <React.Fragment key={order.id}>
                      <TableRow>
                        <TableCell className="font-medium text-foreground">{order.id}</TableCell>
                        <TableCell className="text-muted-foreground">{order.date}</TableCell>
                        <TableCell className="text-muted-foreground">{order.trackingNumber ?? "—"}</TableCell>
                        <TableCell className="text-foreground">{detail?.items?.length ?? "—"}</TableCell>
                        <TableCell className="text-foreground">₱{order.total.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" onClick={() => void onToggle(order.id)}>
                            {isOpen ? "Hide" : "View"}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isOpen && (
                        <TableRow>
                          <TableCell colSpan={7} className="whitespace-normal p-4 bg-muted/30">
                            <div className="space-y-4">
                              <div>
                                <div className="font-semibold text-foreground mb-2">Products Ordered</div>
                                {!detail ? (
                                  <div className="text-sm text-muted-foreground">Loading details…</div>
                                ) : detail.items.length === 0 ? (
                                  <div className="text-sm text-muted-foreground">No items found.</div>
                                ) : (
                                  <div className="space-y-2">
                                    {detail.items.map((item, idx) => (
                                      <div key={`${order.id}_${idx}`} className="flex justify-between text-sm">
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
                                    <span className="font-medium text-foreground">Courier:</span> {detail?.courier ?? "—"}
                                  </div>
                                  <div>
                                    <span className="font-medium text-foreground">Tracking #:</span> {detail?.trackingNumber ?? order.trackingNumber ?? "—"}
                                  </div>
                                  <div>
                                    <span className="font-medium text-foreground">Address:</span> {detail?.addressText ?? "—"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
