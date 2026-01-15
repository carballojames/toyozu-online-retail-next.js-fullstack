"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { AdminOrder } from "../../admin-dashboard.types";
import { formatPhp, statusVariant } from "../../admin-dashboard.utils";

type Props = {
  orders: AdminOrder[];
  onView: (orderId: string) => void;
  emptyMessage?: string;
};

export default function OrdersTable({
  orders,
  onView,
  emptyMessage = "No orders found.",
}: Props) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">{o.id}</TableCell>
              <TableCell>{o.date}</TableCell>
              <TableCell>{o.customerName}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
              </TableCell>
              <TableCell className="text-right">{formatPhp(o.total)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => onView(o.id)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
