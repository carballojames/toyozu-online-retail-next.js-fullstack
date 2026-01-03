"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { AdminOrder } from "../admin-dashboard.types";
import { formatPhp, statusVariant } from "../admin-dashboard.utils";

type Props = {
  orders: AdminOrder[];
  title?: string;
};

export default function RecentOrdersTable({ orders, title = "Recent orders" }: Props) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-sm font-semibold text-foreground mb-2">{title}</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
