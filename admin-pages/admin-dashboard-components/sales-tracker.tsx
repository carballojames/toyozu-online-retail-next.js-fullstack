"use client";

import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SalesRow = {
  saleId: number | null;
  deliveryId: number;
  customerName: string;
  itemsBought: number;
  totalPrice: number;
  deliveredDate: string;
};

type SaleDetail = {
  data?: {
    saleId: number;
    deliveryId: number;
    customerName: string;
    paymentType: string;
    deliveredDate: string;
    totalPrice: number;
    items: Array<{ id: string; name: string; quantity: number; subtotal: number }>;
  };
  error?: string;
};

function formatPhp(value: number): string {
  return `₱${Number(value ?? 0).toLocaleString()}`;
}

export default function SalesTrackerPage() {
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [query, setQuery] = useState<string>("");
  const [appliedQuery, setAppliedQuery] = useState<string>("");

  const [sorting, setSorting] = useState<SortingState>([
    { id: "deliveredDate", desc: true },
  ]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSaleId, setDetailSaleId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SaleDetail["data"]>(undefined);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>("");

  const load = async (q?: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      const normalized = (q ?? "").trim();
      if (normalized) params.set("q", normalized);

      const res = await fetch(`/api/admin/sales-tracker?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as { data?: SalesRow[]; error?: string };
      if (!res.ok || !Array.isArray(json.data)) {
        setRows([]);
        setError(json.error || "Failed to load sales tracker");
        return;
      }

      setRows(
        json.data.map((r) => ({
          saleId: typeof r.saleId === "number" ? r.saleId : null,
          deliveryId: Number(r.deliveryId ?? 0),
          customerName: String(r.customerName ?? ""),
          itemsBought: Number(r.itemsBought ?? 0),
          totalPrice: Number(r.totalPrice ?? 0),
          deliveredDate: String(r.deliveredDate ?? ""),
        })),
      );
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Failed to load sales tracker");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (saleId: number) => {
    setDetailLoading(true);
    setDetailError("");
    setDetail(undefined);
    try {
      const res = await fetch(`/api/admin/sales-tracker/${encodeURIComponent(String(saleId))}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const json = (await res.json()) as SaleDetail;
      if (!res.ok || !json.data) {
        setDetailError(json.error || "Failed to load sale details");
        return;
      }
      setDetail(json.data);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Failed to load sale details");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void load(appliedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedQuery]);

  const columns = useMemo<ColumnDef<SalesRow>[]>(
    () => [
      {
        accessorKey: "customerName",
        header: "User",
        cell: ({ row }) => row.original.customerName || "—",
      },
      {
        accessorKey: "itemsBought",
        header: "Total items",
        cell: ({ row }) => row.original.itemsBought,
      },
      {
        accessorKey: "totalPrice",
        header: "Total price",
        cell: ({ row }) => formatPhp(row.original.totalPrice),
      },
      {
        accessorKey: "deliveredDate",
        header: "Delivered date",
        cell: ({ row }) => row.original.deliveredDate || "—",
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Delivered + paid sales only. Click a row to view items.
          </p>
        </div>

        <Button variant="outline" onClick={() => void load(appliedQuery)} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user name or sale id"
            className="max-w-md"
          />
          <Button
            onClick={() => setAppliedQuery(query)}
            disabled={loading}
          >
            Search
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setAppliedQuery("");
            }}
            disabled={loading && !appliedQuery}
          >
            Reset
          </Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead
                      key={h.id}
                      className={h.column.getCanSort() ? "cursor-pointer select-none" : undefined}
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-10">
                    {loading ? "Loading…" : "No sales found."}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => {
                      const saleId = r.original.saleId;
                      if (!saleId) return;
                      setDetailSaleId(saleId);
                      setDetailOpen(true);
                      void loadDetail(saleId);
                    }}
                  >
                    {r.getVisibleCells().map((c) => (
                      <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetail(undefined);
            setDetailError("");
            setDetailSaleId(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
          </DialogHeader>

          {detailError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {detailError}
            </div>
          ) : null}

          {detailLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                <div><span className="text-muted-foreground">User:</span> {detail.customerName || "—"}</div>
                <div><span className="text-muted-foreground">Delivered:</span> {detail.deliveredDate || "—"}</div>
                <div><span className="text-muted-foreground">Payment:</span> {detail.paymentType || "—"}</div>
                <div><span className="text-muted-foreground">Total:</span> {formatPhp(detail.totalPrice)}</div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.name || "—"}</TableCell>
                        <TableCell className="text-right">{it.quantity}</TableCell>
                        <TableCell className="text-right">{formatPhp(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                    {detail.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                          No items.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              {detailSaleId ? (
                <div className="text-xs text-muted-foreground">Sale ID: {detailSaleId}</div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Select a row to view details.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
