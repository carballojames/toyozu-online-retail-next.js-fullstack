"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import OrdersTable from "./tables/AdminOrdersTable";
import {
  useAdminOrderDetailQuery,
  useAdminOrdersQuery,
  useUpdateAdminOrderMutation,
} from "@/hooks/admin/use-admin-orders";
import { statusVariant } from "@/pages/admin-pages/admin-dashboard.utils";
import type { AdminOrder } from "@/pages/admin-pages/admin-dashboard.types";

function formatPhp(value: number): string {
  return `₱${Number(value ?? 0).toLocaleString()}`;
}

export default function OrdersPage() {
  const ordersQuery = useAdminOrdersQuery();
  const updateOrderMutation = useUpdateAdminOrderMutation();

  const [open, setOpen] = useState(false);
  const [activeSaleId, setActiveSaleId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [nextStatus, setNextStatus] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const detailQuery = useAdminOrderDetailQuery(activeSaleId, open);

  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const loading = ordersQuery.isLoading || ordersQuery.isFetching;
  const detail = detailQuery.data ?? null;
  const detailLoading = detailQuery.isLoading || detailQuery.isFetching;
  const saving = updateOrderMutation.isPending;
  const error = ordersQuery.error instanceof Error ? ordersQuery.error.message : null;
  const selectedStatus = nextStatus ?? detail?.status ?? "";
  const selectedTrackingNumber = trackingNumber ?? detail?.trackingNumber ?? "";

  const mapped = useMemo<AdminOrder[]>(() => {
    return orders.map((o) => ({
      id: o.id,
      date: o.date,
      customerName: o.customerName,
      total: Number(o.total ?? 0),
      status: o.status,
    }));
  }, [orders]);

  const onView = (orderId: string) => {
    setActiveSaleId(orderId);
    setOpen(true);
    setNextStatus(null);
    setTrackingNumber(null);
    setDetailError(null);
  };

  const onSave = async () => {
    if (!activeSaleId) return;
    if (!selectedStatus) {
      setDetailError("Select a status.");
      return;
    }

    try {
      setDetailError(null);
      await updateOrderMutation.mutateAsync({
        saleId: activeSaleId,
        statusName: selectedStatus,
        trackingNumber: selectedTrackingNumber,
      });
      await Promise.all([detailQuery.refetch(), ordersQuery.refetch()]);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Failed to update order");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-bold text-foreground">Orders</div>
          <div className="text-sm text-muted-foreground">Upcoming orders and delivery status updates</div>
        </div>
        <Button variant="outline" onClick={() => void ordersQuery.refetch()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      <OrdersTable
        orders={mapped}
        onView={onView}
        emptyMessage={loading ? "Loading orders…" : "No upcoming orders."}
      />

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setActiveSaleId(null);
            setNextStatus(null);
            setTrackingNumber(null);
            setDetailError(null);
          }
        }}
      >
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
                    <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
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
                  <Select value={selectedStatus} onValueChange={setNextStatus}>
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
                  <Input value={selectedTrackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. LBC-123456" />
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
