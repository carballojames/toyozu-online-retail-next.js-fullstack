"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TabId = "tracking" | "profile" | "addresses" | "orders" | "vouchers";

type NavItem = { id: TabId; label: string; icon: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { id: "profile", label: "User Details", icon: "👤", href: "/user/profile" },
  { id: "tracking", label: "Order Tracking", icon: "🚚", href: "/user/tracking" },
  { id: "addresses", label: "My Addresses", icon: "📍", href: "/user/addresses" },
  { id: "orders", label: "Order History", icon: "📦", href: "/user/orders" },
  { id: "vouchers", label: "Vouchers", icon: "🎫", href: "/user/vouchers" },
];

export default function UserAsideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-surface border-r border-border min-h-[calc(100vh-4rem)] sticky top-16">
      <nav className="p-6">
        <ul className="space-y-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
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
