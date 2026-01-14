"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { AdminTabId, NavItem } from "../../admin-dashboard.types";

function routeForTab(id: AdminTabId): string {
  switch (id) {
    case "products":
      return "/admin-dashboard/product-management";
    case "inventory":
      return "/admin-dashboard/inventory-management";
    case "addresses":
      return "/admin-dashboard/address-management";
    case "users":
      return "/admin-dashboard/user-management";
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

  return (
    <aside className="w-64 shrink-0 bg-surface border-r border-border min-h-screen sticky top-0">
      <nav className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold italic text-foreground text-center">Admin Dashboard</h2>
        </div>
        <ul className="space-y-2">
          {items.map((item) => {
            const href = routeForTab(item.id);
            const isActive = activeTab === item.id || pathname?.startsWith(href);
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
          })}
        </ul>
      </nav>
    </aside>
  );
}
