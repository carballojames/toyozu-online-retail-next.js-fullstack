"use client";

import { useEffect, useState } from "react";

import Header from "../app/common/Header";
import OrderHistorySection from "@/components/user-components/user-dashboard-components/OrderHistorySection";

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

type OrderStatus = "Pending" | "Processing" | "In Transit" | "Delivered";

type TabId = "tracking" | "profile" | "addresses" | "orders" | "vouchers";

type Order = {
  id: string;
  date: string;
  status: OrderStatus;
  trackingNumber: string;
  items: number;
  total: string;
};

type UserProfile = {
  id: number;
  user_name: string;
  email?: string;
  username?: string;
  mobile_phone?: string;
  role_id?: number;
  profile_picture?: string | null;
};

const MOCK_ORDERS: Order[] = [
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

function statusToBadgeVariant(status: OrderStatus): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "Delivered") return "secondary";
  if (status === "In Transit") return "primary";
  return "default";
}

export default function AccountDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("tracking");
  const [orders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const userId = user?.id;

  const sidebarItems: Array<{ id: TabId; label: string; icon: string }> = [
    { id: "profile", label: "User Details", icon: "👤" },
    { id: "tracking", label: "Order Tracking", icon: "🚚" },
    { id: "addresses", label: "My Addresses", icon: "📍" },
    { id: "orders", label: "Order History", icon: "📦" },
    { id: "vouchers", label: "Vouchers", icon: "🎫" },
  ];

  const handleUpload = async () => {
    if (!file) {
      window.alert("Please select a file first.");
      return;
    }

    setUploading(true);
    try {
      const userId = user?.id ?? Number(localStorage.getItem("user_id"));
      if (!userId) {
        window.alert("Please sign in again.");
        return;
      }

      const form = new FormData();
      form.append("userId", String(userId));
      form.append("file", file);

      const res = await fetch("/api/me/profile-picture", {
        method: "POST",
        body: form,
      });

      const json = (await res.json()) as
        | { data: { profile_picture: string } }
        | { error: string };

      if (!res.ok || !("data" in json)) {
        window.alert("Upload failed");
        return;
      }

      setUser((prev) => (prev ? { ...prev, profile_picture: json.data.profile_picture } : prev));
      window.alert("Profile picture updated.");
    } catch {
      window.alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingUser(true);
      setProfileError(null);
      try {
        const raw = localStorage.getItem("user_id");
        const userId = raw ? Number(raw) : NaN;
        if (!Number.isFinite(userId) || userId <= 0) {
          setProfileError("Please sign in to view your account.");
          return;
        }

        const res = await fetch(`/api/me?userId=${encodeURIComponent(String(userId))}`);
        const json = (await res.json()) as
          | { data: UserProfile }
          | { error: string };

        if (!res.ok || !("data" in json)) {
          setProfileError("Failed to load profile.");
          return;
        }

        if (!cancelled) setUser(json.data);
      } catch {
        if (!cancelled) setProfileError("Failed to load profile.");
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadingUser) {
    return <p className="text-center text-muted-foreground">Loading account...</p>;
  }
  if (!user) {
    return <p className="text-center text-muted-foreground">{profileError ?? "No user data found."}</p>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "tracking":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-primary mb-2">Order Tracking</h2>
              <p className="text-muted-foreground">Track your orders and delivery status</p>
            </div>

            <div className="bg-card p-8 rounded-lg border max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold mb-4 text-center text-foreground">Track Your Order</h3>
              <div className="flex gap-2 flex-col sm:flex-row">
                <Input placeholder="Enter order ID or tracking number" className="flex-1" />
                <Button onClick={() => window.alert("Tracking is demo-only.")}>Track Order</Button>
              </div>
            </div>

            <OrderHistorySection userId={userId} />
          </div>
        )

      case "profile":
        return (
           <div className="space-y-6">

            <div className="max-w-2xl mx-auto bg-card p-8 rounded-lg border">
              <div className="flex items-center mb-6">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mr-6 overflow-hidden">
                  {user.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt="Profile picture"
                      width={80}
                      height={80}
                      className="h-20 w-20 object-cover"
                    />
                  ) : (
                    <span className="text-primary-foreground text-2xl font-bold">{user.user_name?.[0] || "?"}</span>
                  )}
                </div>

                <div>
                  <h3 className="text-2xl font-semibold text-foreground">{user.user_name}</h3>
                  <p className="text-muted-foreground">Email: {user.email || "—"}</p>
                  <p className="text-muted-foreground">Username: {user.username || "—"}</p>
                  <p className="text-muted-foreground">Phone: {user.mobile_phone || "—"}</p>
                  <p className="text-muted-foreground font-semibold">Role: {user.role_id || "—"}</p>

                </div>
              </div>

              <div className="space-y-3">
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload Picture"}
                </Button>
              </div>
            </div>
          </div>


        )

      case "addresses":
        return null

      case "orders":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-bold text-foreground">Order History</h2>
              {selectedOrders.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">{selectedOrders.length} selected</Badge>
                  <Button variant="outline" onClick={() => window.alert("Demo only")}>Download</Button>
                </div>
              )}
            </div>

            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"> </TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Order rows removed (mock data) — use OrderHistorySection for real orders */}
                  </TableBody>
                </Table>
              </div>
            </div>

            <OrderHistorySection userId={userId} />
          </div>
        )

      case "vouchers":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Vouchers</h2>
              <Button onClick={() => window.alert("Demo only")}>Browse Offers</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`p-6 rounded-lg border-2 ${
                    order.status === "Delivered" ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl">🎫</span>
                    <Badge variant={statusToBadgeVariant(order.status)}>{order.status}</Badge>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{order.total}</h3>
                  <p className="text-sm text-muted-foreground mb-4">Order ID: {order.id}</p>
                  <p className="text-sm text-muted-foreground mb-4">Tracking: {order.trackingNumber}</p>
                  {order.status === "Delivered" && (
                    <Button className="w-full" onClick={() => window.alert("Demo only")}>Use Now</Button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Redeem Voucher Code</h3>
              <div className="flex gap-4">
                <Input placeholder="Enter voucher code" className="flex-1" />
                <Button onClick={() => window.alert("Demo only")}>Redeem</Button>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Content for {activeTab} coming soon...</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      

      <div className="flex max-w-7xl mx-auto">
        <aside className="w-64 bg-transparent border-r border-border min-h-screen">
          <nav className="p-6">
            <ul className="space-y-3">
              {sidebarItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium ${
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 p-8 bg-card">{renderContent()}</main>
      </div>
    </div>
  )
}
