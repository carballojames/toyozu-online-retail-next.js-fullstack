"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TabId = "tracking" | "profile" | "addresses" | "orders" | "vouchers";

type NavItem = { id: TabId; label: string; icon: string; segment: string };

const NAV_ITEMS: NavItem[] = [
  { id: "profile", label: "User Details", icon: "👤", segment: "profile" },
  { id: "tracking", label: "Order Tracking", icon: "🚚", segment: "tracking" },
  { id: "addresses", label: "My Addresses", icon: "📍", segment: "addresses" },
  { id: "orders", label: "Order History", icon: "📦", segment: "orders" },
  { id: "vouchers", label: "Vouchers", icon: "🎫", segment: "vouchers" },
];

function getUserBasePath(pathname: string | null): string {
  if (!pathname) return "/user";

  // If we're already under /user/<username>/..., keep that base for navigation.
  // Example: /user/john/profile -> base /user/john
  const m = pathname.match(/^\/user\/([^/]+)(?:\/|$)/);
  const firstSegment = m?.[1];

  // Important: /user/profile, /user/orders, etc. are *not* username routes.
  const dashboardSegments = new Set(["profile", "tracking", "addresses", "orders", "vouchers"]);
  if (firstSegment && !dashboardSegments.has(firstSegment)) {
    return `/user/${firstSegment}`;
  }

  return "/user";
}

export default function UserAsideNav() {
  const pathname = usePathname();
  const basePath = getUserBasePath(pathname);

  return (
    <aside className="w-64 bg-primary-foreground border-r border-border min-h-[calc(100vh-4rem)] sticky top-16">
      <nav className="p-6">
        <ul className="space-y-3">
          {NAV_ITEMS.map((item) => {
            const href = `${basePath}/${item.segment}`;
            const isActive = pathname === href || pathname?.startsWith(href + "/");
            return (
              <li key={item.id}>
                <Link
                  href={href}
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
