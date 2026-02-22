"use client";

import { useMemo, useState } from "react";
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
import {
  useAdminSupplyDetailQuery,
  useAdminSupplyTrackerQuery,
  type SupplyRow,
} from "@/hooks/admin/use-admin-supply-tracker";

function formatPhp(value: number): string {
  return `₱${Number(value ?? 0).toLocaleString()}`;
}

export default function SupplyTrackerPage() {
  const [query, setQuery] = useState<string>("");
  const [appliedQuery, setAppliedQuery] = useState<string>("");

  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSupplyId, setDetailSupplyId] = useState<number | null>(null);
  const supplyQuery = useAdminSupplyTrackerQuery(appliedQuery);
  const detailQuery = useAdminSupplyDetailQuery(detailSupplyId, detailOpen);

  const rows = supplyQuery.data ?? [];
  const loading = supplyQuery.isLoading || supplyQuery.isFetching;
  const error = supplyQuery.error instanceof Error ? supplyQuery.error.message : "";
  const detail = detailQuery.data;
  const detailLoading = detailQuery.isLoading || detailQuery.isFetching;
  const detailError = detailQuery.error instanceof Error ? detailQuery.error.message : "";

  const columns = useMemo<ColumnDef<SupplyRow>[]>(
    () => [
      {
        accessorKey: "receiptNumber",
        header: "Receipt",
        cell: ({ row }) => row.original.receiptNumber || "—",
      },
      {
        accessorKey: "supplierName",
        header: "Supplier",
        cell: ({ row }) => row.original.supplierName || "—",
      },
      {
        accessorKey: "itemsBought",
        header: "Total items",
        cell: ({ row }) => row.original.itemsBought,
      },
      {
        accessorKey: "totalPurchasePrice",
        header: "Total purchase",
        cell: ({ row }) => formatPhp(row.original.totalPurchasePrice),
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => row.original.date || "—",
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
          <h1 className="text-2xl font-bold text-foreground">Supply Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Supply receipts (purchase costs). Click a row to view receipt items.
          </p>
        </div>

        <Button variant="outline" onClick={() => void supplyQuery.refetch()} disabled={loading}>
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
            placeholder="Search by supplier, receipt number, or supply id"
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
                    {loading ? "Loading…" : "No supplies found."}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => {
                      const supplyId = r.original.supplyId;
                      setDetailSupplyId(supplyId);
                      setDetailOpen(true);
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
            setDetailSupplyId(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Supply Receipt Details</DialogTitle>
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
                <div><span className="text-muted-foreground">Receipt:</span> {detail.receiptNumber || "—"}</div>
                <div><span className="text-muted-foreground">Date:</span> {detail.date || "—"}</div>
                <div><span className="text-muted-foreground">Supplier:</span> {detail.supplierName || "—"}</div>
                <div><span className="text-muted-foreground">Total:</span> {formatPhp(detail.totalPurchasePrice)}</div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.name || "—"}</TableCell>
                        <TableCell className="text-right">{it.quantity}</TableCell>
                        <TableCell className="text-right">{formatPhp(it.purchasePrice)}</TableCell>
                        <TableCell className="text-right">{formatPhp(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                    {detail.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                          No items.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              {detailSupplyId ? (
                <div className="text-xs text-muted-foreground">Supply ID: {detailSupplyId}</div>
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
