import React, { useMemo, useState } from "react";
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

type OrderStatus = "Pending" | "Processing" | "In Transit" | "Delivered";

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

const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-10021",
    date: "2025-12-01",
    status: "In Transit",
    total: 3490,
    trackingNumber: "TRK-882019",
    courier: "Demo Express",
    addressText: "Makati, NCR",
    items: [
      { name: "Brake Pads (Front)", quantity: 1, subtotal: 2490 },
      { name: "Brake Cleaner", quantity: 2, subtotal: 1000 },
    ],
  },
  {
    id: "ORD-10015",
    date: "2025-11-20",
    status: "Delivered",
    total: 1590,
    trackingNumber: "TRK-771102",
    courier: "Demo Express",
    addressText: "Taguig, NCR",
    items: [{ name: "Oil Filter", quantity: 3, subtotal: 1590 }],
  },
  {
    id: "ORD-10008",
    date: "2025-11-02",
    status: "Processing",
    total: 4990,
    trackingNumber: "TRK-665500",
    courier: "Demo Express",
    addressText: "Pasig, NCR",
    items: [{ name: "Engine Oil 5W-30", quantity: 5, subtotal: 4990 }],
  },
];

function statusBadgeVariant(status: OrderStatus): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "Delivered") return "secondary";
  if (status === "In Transit") return "primary";
  if (status === "Processing") return "default";
  return "default";
}

type Props = {
  userId?: string | number;
};

export default function OrderHistorySection({ userId }: Props) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [query, setQuery] = useState("");

  const orders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_ORDERS.filter((o) => {
      if (statusFilter !== "All" && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.trackingNumber?.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [query, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-muted-foreground">Demo only (no backend){userId ? ` • User ${userId}` : ""}</div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "All")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Orders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Orders</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="In Transit">In Transit</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders..." className="w-[220px]" />
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="max-h-[28rem] overflow-y-auto">
          {orders.length === 0 ? (
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
                {orders.map((order) => {
                  const isOpen = expandedOrderId === order.id;
                  return (
                    <React.Fragment key={order.id}>
                      <TableRow>
                        <TableCell className="font-medium text-foreground">{order.id}</TableCell>
                        <TableCell className="text-muted-foreground">{order.date}</TableCell>
                        <TableCell className="text-muted-foreground">{order.trackingNumber ?? "—"}</TableCell>
                        <TableCell className="text-foreground">{order.items.length}</TableCell>
                        <TableCell className="text-foreground">₱{order.total.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" onClick={() => setExpandedOrderId(isOpen ? null : order.id)}>
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
                                <div className="space-y-2">
                                  {order.items.map((item, idx) => (
                                    <div key={`${order.id}_${idx}`} className="flex justify-between text-sm">
                                      <div className="text-foreground">
                                        {item.name} <span className="text-muted-foreground">x {item.quantity}</span>
                                      </div>
                                      <div className="text-foreground">₱{item.subtotal.toLocaleString()}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div className="font-semibold text-foreground mb-2">Delivery Details</div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  <div>
                                    <span className="font-medium text-foreground">Courier:</span> {order.courier ?? "—"}
                                  </div>
                                  <div>
                                    <span className="font-medium text-foreground">Tracking #:</span> {order.trackingNumber ?? "—"}
                                  </div>
                                  <div>
                                    <span className="font-medium text-foreground">Address:</span> {order.addressText ?? "—"}
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
