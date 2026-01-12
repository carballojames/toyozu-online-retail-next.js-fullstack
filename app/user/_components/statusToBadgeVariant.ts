import type { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "./mockOrders";

export function statusToBadgeVariant(
  status: OrderStatus
): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "Delivered") return "secondary";
  if (status === "In Transit") return "primary";
  return "default";
}
