import type { AdminOrderStatus } from "./admin-dashboard.types";

export type BadgeVariant = "default" | "primary" | "secondary" | "destructive";

export function formatPhp(value: number): string {
  return `₱${value.toLocaleString()}`;
}

export function statusVariant(status: AdminOrderStatus): BadgeVariant {
  if (status === "Delivered") return "secondary";
  if (status === "In Transit" || status === "Pickup by courier" || status === "Tracking number posted") return "primary";
  if (status === "Cancelled") return "destructive";
  return "default";
}
