"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {PanelRightClose , PanelRightOpen  } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import type { AdminTabId, NavItem } from "@/pages/admin-pages/admin-dashboard.types";

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
  const [isCollapsed, setIsCollapsed] = useState(false);

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
          className={`w-full flex items-center ${isCollapsed ? "justify-center px-0" : "gap-3 px-4"} py-2 rounded-2xl text-left transition-all duration-300 font-medium overflow-hidden ${
            isActive ? "bg-secondary text-primary-foreground" : "text-foreground hover:bg-muted"
          }`}
          title={isCollapsed ? item.label : undefined}
          aria-current={isActive ? "page" : undefined}
        >
          <span className="text-lg shrink-0 flex items-center justify-center">{item.icon}</span>
          <span className={`truncate transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100"}`}>
            {item.label}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <aside className={`shrink-0 bg-surface border-r border-border min-h-screen sticky top-0 transition-[width] duration-300 ease-in-out ${isCollapsed ? "w-20" : "w-64"}`}>
      <nav className={`py-6 flex flex-col h-full overflow-x-hidden ${isCollapsed ? "px-2" : "px-6"}`}>
        <div className={`flex items-center mb-6 overflow-hidden ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <div className={`flex items-center gap-2 truncate transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "opacity-100"}`}>
            <h2 className="text-base font-semibold text-foreground truncate">
              {title}
            </h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="shrink-0"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <PanelRightClose  className="h-5 w-5" /> : <PanelRightOpen  className="h-5 w-5" />}
          </Button>
        </div>

        <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? "mb-0 h-0 opacity-0" : "mb-3 h-6 opacity-100"}`}>
          <Label className="text-sm font-medium text-muted-foreground">{isCollapsed ? "" : "General"}</Label>
        </div>

        <ul className="space-y-2">
          {findItem("overview") ? renderItem(findItem("overview") as NavItem) : null}
        </ul>

        {isCollapsed && <div className="mt-4 mb-2 border-t border-border mx-2" />}

        <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? "mb-0 mt-0 h-0 opacity-0" : "mt-6 mb-2 h-6 opacity-100"}`}>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{isCollapsed ? "" : "Product"}</Label>
        </div>

        <ul className="space-y-2">
          {productGroup.map((id) => {
            const it = findItem(id as AdminTabId);
            return it ? renderItem(it) : null;
          })}
        </ul>

        {isCollapsed && <div className="mt-4 mb-2 border-t border-border mx-2" />}

        <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? "mb-0 mt-0 h-0 opacity-0" : "mt-6 mb-2 h-6 opacity-100"}`}>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{isCollapsed ? "" : "Admin"}</Label>
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
