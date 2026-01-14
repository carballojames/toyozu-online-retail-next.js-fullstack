"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import OrdersTable from "./tables/OrdersTable";
import { statusVariant } from "../admin-dashboard.utils";

type AdminOrderRow = {
  id: string;
  saleId: number | null;
  deliveryId: number;
  date: string;
  customerName: string;
  status: string;
  total: number;
};

type OrderDetail = {
  saleId: number | null;
  deliveryId: number;
  date: string;
  paymentType: string;
  status: string;
  trackingNumber: string | null;
  courier: { id: number; name: string } | null;
  address: { id: number; text: string } | null;
  customer: { id: number; name: string } | null;
  totals: { shipping: number; total: number };
  items: Array<{ name: string; quantity: number; subtotal: number }>;
  history: Array<{ id: string; at: string | null; status: string; sequence: number; location: string | null }>;
  statusOptions: Array<{ status_name: string; sequence_order: number }>;
};

function formatPhp(value: number): string {
  return `₱${Number(value ?? 0).toLocaleString()}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [activeSaleId, setActiveSaleId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [nextStatus, setNextStatus] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/orders", { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
      const json = (await res.json()) as { data?: AdminOrderRow[]; error?: string };
      if (!res.ok || !Array.isArray(json.data)) throw new Error(json.error || "Failed to load orders");
      setOrders(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const mapped = useMemo(() => {
    return orders.map((o) => ({
      id: o.id,
      date: o.date,
      customerName: o.customerName,
      total: Number(o.total ?? 0),
      status: o.status as any,
    }));
  }, [orders]);

  const loadDetail = async (saleId: string) => {
    try {
      setDetailLoading(true);
      setDetailError(null);
      setDetail(null);
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(saleId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const json = (await res.json()) as { data?: OrderDetail; error?: string };
      if (!res.ok || !json.data) throw new Error(json.error || "Failed to load order");
      setDetail(json.data);
      setNextStatus(json.data.status);
      setTrackingNumber(json.data.trackingNumber ?? "");
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setDetailLoading(false);
    }
  };

  const onView = (orderId: string) => {
    setActiveSaleId(orderId);
    setOpen(true);
    void loadDetail(orderId);
  };

  const onSave = async () => {
    if (!activeSaleId) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(activeSaleId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          statusName: nextStatus,
          trackingNumber,
        }),
      });
      const json = (await res.json()) as { data?: unknown; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to update order");
      await loadDetail(activeSaleId);
      await loadOrders();
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-bold text-foreground">Orders</div>
          <div className="text-sm text-muted-foreground">Upcoming orders and delivery status updates</div>
        </div>
        <Button variant="outline" onClick={() => void loadOrders()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      <OrdersTable
        orders={mapped as any}
        onView={onView}
        emptyMessage={loading ? "Loading orders…" : "No upcoming orders."}
      />

      <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order {activeSaleId ?? ""}</DialogTitle>
          </DialogHeader>

          {detailError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{detailError}</div>
          ) : null}

          {detailLoading || !detail ? (
            <div className="text-sm text-muted-foreground">Loading order…</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="text-sm">
                  <div className="text-muted-foreground">Customer</div>
                  <div className="text-foreground font-medium">{detail.customer?.name ?? "—"}</div>
                </div>
                <div className="text-sm">
                  <div className="text-muted-foreground">Status</div>
                  <div>
                    <Badge variant={statusVariant(detail.status as any)}>{detail.status}</Badge>
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-muted-foreground">Courier</div>
                  <div className="text-foreground font-medium">{detail.courier?.name ?? "—"}</div>
                </div>
                <div className="text-sm">
                  <div className="text-muted-foreground">Total</div>
                  <div className="text-foreground font-medium">{formatPhp(detail.totals.total)}</div>
                </div>
                <div className="text-sm sm:col-span-2">
                  <div className="text-muted-foreground">Address</div>
                  <div className="text-foreground">{detail.address?.text ?? "—"}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Update status</div>
                  <Select value={nextStatus} onValueChange={setNextStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {detail.statusOptions.map((s) => (
                        <SelectItem key={s.status_name} value={s.status_name}>
                          {s.status_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Tracking number</div>
                  <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. LBC-123456" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Items</div>
                <div className="space-y-1 text-sm">
                  {detail.items.map((it, idx) => (
                    <div key={`${detail.deliveryId}_${idx}`} className="flex items-center justify-between">
                      <div className="text-foreground">
                        {it.name} <span className="text-muted-foreground">x {it.quantity}</span>
                      </div>
                      <div className="text-foreground">{formatPhp(it.subtotal)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">History</div>
                <div className="space-y-1 text-sm">
                  {detail.history.length === 0 ? (
                    <div className="text-muted-foreground">No history yet.</div>
                  ) : (
                    detail.history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between gap-4">
                        <div className="text-foreground">{h.status}</div>
                        <div className="text-muted-foreground">{h.at ? new Date(h.at).toLocaleString() : "—"}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={() => void onSave()} disabled={saving || detailLoading || !detail}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
