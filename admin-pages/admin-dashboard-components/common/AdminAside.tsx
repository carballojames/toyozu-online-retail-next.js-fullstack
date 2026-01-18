"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

import type { AdminTabId, NavItem } from "../../admin-dashboard.types";

function routeForTab(id: AdminTabId): string {
  switch (id) {
    case "orders":
      return "/admin-dashboard/orders-management";
    case "stocks":
      return "/admin-dashboard/product-management";
    case "inventory":
      return "/admin-dashboard/inventory-management";
    case "car-compatibility":
      return "/admin-dashboard/car-compatibility-management";
    case "users":
      return "/admin-dashboard/user-management";
    case "sales-tracker":
      return "/admin-dashboard/sales-tracker-management";
    case "supply-tracker":
      return "/admin-dashboard/supply-tracker-management";
    case "overview":
      return "/admin-dashboard/overview-management";
    default:
      return "/admin-dashboard";
  }
}
export default function AdminAside({
  title = "Admin Dashboard",
  items,
  activeTab,
  onTabChange,
}: {
  title?: string;
  items: NavItem[];
  activeTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
}): ReactNode {
  const pathname = usePathname();

  const findItem = (id: AdminTabId) => items.find((it) => it.id === id);

  const productGroup: AdminTabId[] = ["stocks", "inventory", "car-compatibility", "orders"];
  const adminGroup: AdminTabId[] = ["users", "sales-tracker", "supply-tracker"];

  const renderItem = (item: NavItem) => {
    const href = routeForTab(item.id);
    const pathnameNormalized = pathname?.replace(/\/+$|\\s+$/, "") ?? "";
    const hrefNormalized = href.replace(/\/+$/, "");
    const isActive =
      activeTab === item.id ||
      (hrefNormalized === "/admin-dashboard"
        ? pathnameNormalized === hrefNormalized
        : pathnameNormalized.startsWith(hrefNormalized));

    return (
      <li key={item.id}>
        <Link
          href={href}
          onClick={() => onTabChange(item.id)}
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-2xl text-left transition-colors font-medium ${
            isActive ? "bg-secondary text-primary-foreground" : "text-foreground hover:bg-muted"
          }`}
          aria-current={isActive ? "page" : undefined}
        >
          <span className="text-lg">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <aside className="w-64 shrink-0 bg-surface border-r border-border min-h-screen sticky top-0">
      <nav className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold italic text-foreground text-center">Admin Dashboard</h2>
        </div>

        <div className="mb-3">
          <Label className="text-sm font-semibold text-muted-foreground">General</Label>
        </div>

        <ul className="space-y-2">
          {findItem("overview") ? renderItem(findItem("overview") as NavItem) : null}
        </ul>

        <div className="mt-6 mb-2">
          <Label className="text-xs font-medium text-muted-foreground">Product </Label>
        </div>

        <ul className="space-y-2">
          {productGroup.map((id) => {
            const it = findItem(id as AdminTabId);
            return it ? renderItem(it) : null;
          })}
        </ul>

        <div className="mt-6 mb-2">
          <Label className="text-xs font-medium text-muted-foreground"> Admin</Label>
        </div>

        <ul className="space-y-2">
          {adminGroup.map((id) => {
            const it = findItem(id as AdminTabId);
            return it ? renderItem(it) : null;
          })}
        </ul>
      </nav>
    </aside>
  );
}
