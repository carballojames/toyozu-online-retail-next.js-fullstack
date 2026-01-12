export type OrderStatus = "Pending" | "Processing" | "In Transit" | "Delivered";

export type Order = {
  id: string;
  date: string;
  status: OrderStatus;
  trackingNumber: string;
  items: number;
  total: string;
};

export const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-10021",
    date: "2025-12-01",
    status: "In Transit",
    trackingNumber: "TRK-882019",
    items: 3,
    total: "₱3,490",
  },
  {
    id: "ORD-10008",
    date: "2025-11-02",
    status: "Processing",
    trackingNumber: "TRK-665500",
    items: 5,
    total: "₱4,990",
  },
  {
    id: "ORD-10015",
    date: "2025-11-20",
    status: "Delivered",
    trackingNumber: "TRK-771102",
    items: 1,
    total: "₱1,590",
  },
];
