"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {ChartSpline, Logs, Package, Settings, Users, Wrench } from "lucide-react";

import Header from "../app/common/Header";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import EmployeesTable from "./admin-dashboard-components/EmployeesTable";
import AddProductModal from "./admin-dashboard-components/AddProductModal";
import EditProductModal from "./admin-dashboard-components/EditProductModal";
import InventoryTable from "./admin-dashboard-components/InventoryTable";
import OrdersTable from "./admin-dashboard-components/OrdersTable";
import ProductsTable from "./admin-dashboard-components/ProductsTable";
import RecentOrdersTable from "./admin-dashboard-components/RecentOrdersTable";

import type {
  AdminOrder,
  AdminOrderStatus,
  AdminProduct,
  AdminTabId,
  Employee,
  NavItem,
  Permission,
  RoleId,
} from "./admin-dashboard.types";

import { formatPhp as formatCurrency } from "./admin-dashboard.utils";

const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  0: [
    "VIEW_ANALYTICS",
    "VIEW_ORDERS",
    "MANAGE_PRODUCTS",
    "MANAGE_INVENTORY",
    "MANAGE_EMPLOYEES",
    "EDIT_PROFILE",
  ],
  1: [
    "VIEW_ANALYTICS",
    "VIEW_ORDERS",
    "MANAGE_PRODUCTS",
    "MANAGE_INVENTORY",
    "MANAGE_EMPLOYEES",
    "EDIT_PROFILE",
  ],
  2: [
    "VIEW_ANALYTICS",
    "VIEW_ORDERS",
    "MANAGE_PRODUCTS",
    "MANAGE_INVENTORY",
    "EDIT_PROFILE",
  ],
  3: ["MANAGE_PRODUCTS", "MANAGE_INVENTORY", "EDIT_PROFILE"],
  4: ["VIEW_ORDERS", "EDIT_PROFILE"],
};

function hasPermission(roleId: RoleId, permission: Permission): boolean {
  return ROLE_PERMISSIONS[roleId]?.includes(permission) ?? false;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: <ChartSpline />, permission: "VIEW_ANALYTICS" },
  { id: "orders", label: "Order Management", icon: <Logs />, permission: "VIEW_ORDERS" },
  {
    id: "products",
    label: "Product Management",
    icon: <Wrench /> ,
    permission: "MANAGE_PRODUCTS",
  },
  { id: "inventory", label: "Inventory", icon: <Package />, permission: "MANAGE_INVENTORY" },
  {
    id: "employees",
    label: "Employee Management",
    icon: <Users />,
    permission: "MANAGE_EMPLOYEES",
  },
  { id: "profile", label: "Profile Settings", icon: <Settings />, permission: "EDIT_PROFILE" },
];

const DEMO_ORDERS: AdminOrder[] = [
  {
    id: "ORD-20110",
    date: "2025-12-20",
    customerName: "Juan Dela Cruz",
    total: 3490,
    status: "In Transit",
  },
  {
    id: "ORD-20105",
    date: "2025-12-18",
    customerName: "Maria Santos",
    total: 1590,
    status: "Delivered",
  },
  {
    id: "ORD-20101",
    date: "2025-12-16",
    customerName: "Ken Tan",
    total: 4990,
    status: "Processing",
  },
  {
    id: "ORD-20098",
    date: "2025-12-14",
    customerName: "Aira Lim",
    total: 890,
    status: "Pending",
  },
];

const DEMO_PRODUCTS: AdminProduct[] = [
  {
    id: "PRD-1001",
    name: "Brake Pads (Front)",
    brand: "DemoBrand",
    category: "Brakes",
    price: 2490,
    stock: 8,
  },
  {
    id: "PRD-1002",
    name: "Oil Filter",
    brand: "DemoBrand",
    category: "Engine",
    price: 530,
    stock: 24,
  },
  {
    id: "PRD-1003",
    name: "Engine Oil 5W-30",
    brand: "DemoBrand",
    category: "Engine",
    price: 998,
    stock: 4,
  },
  {
    id: "PRD-1004",
    name: "Brake Cleaner",
    brand: "DemoBrand",
    category: "Maintenance",
    price: 500,
    stock: 2,
  },
];

const DEMO_EMPLOYEES: Employee[] = [
  {
    id: "EMP-1",
    name: "John Admin",
    role: "Admin",
    email: "admin@toyozu.com",
    status: "Active",
  },
  {
    id: "EMP-2",
    name: "Sarah Secretary",
    role: "Secretary",
    email: "secretary@toyozu.com",
    status: "Active",
  },
  {
    id: "EMP-3",
    name: "Mike Employee",
    role: "Employee",
    email: "employee@toyozu.com",
    status: "Active",
  },
];

export default function AdminDashboard() {
  const router = useRouter();

  const [roleId, setRoleId] = useState<RoleId | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<AdminOrderStatus | "All">(
    "All"
  );
  const [orderQuery, setOrderQuery] = useState<string>("");
  const [productQuery, setProductQuery] = useState<string>("");

  const [products, setProducts] = useState<AdminProduct[]>(DEMO_PRODUCTS);

  const refreshProducts = async (signal?: AbortSignal): Promise<void> => {
    const res = await fetch("/api/products", {
      signal,
      cache: "no-store",
    });
    if (!res.ok) return;
    const json = (await res.json()) as {
      data?: Array<{
        product_id: number;
        name: string;
        selling_price: number | null;
        quantity: number | null;
        brand?: { name: string } | null;
        category?: { name: string } | null;
      }>;
    };

    const mapped: AdminProduct[] = (json.data ?? []).map((p) => ({
      id: String(p.product_id),
      name: p.name,
      brand: p.brand?.name ?? "",
      category: p.category?.name ?? "",
      price: p.selling_price ?? 0,
      stock: p.quantity ?? 0,
    }));

    setProducts(mapped);
  };

  const [profile, setProfile] = useState({
    name: "Admin User",
    email: "admin@toyozu.com",
    phone: "+63 900 000 0000",
    department: "Administration",
  });

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("role_id") : null;
    const parsed = raw ? Number(raw) : NaN;
    const normalized: RoleId =
      parsed === 0 || parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4
        ? (parsed as RoleId)
        : 4;
    setRoleId(normalized);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const res = await fetch("/api/products", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          data?: Array<{
            product_id: number;
            name: string;
            selling_price: number | null;
            quantity: number | null;
            brand?: { name: string } | null;
            category?: { name: string } | null;
          }>;
        };

        const mapped: AdminProduct[] = (json.data ?? []).map((p) => ({
          id: String(p.product_id),
          name: p.name,
          brand: p.brand?.name ?? "",
          category: p.category?.name ?? "",
          price: p.selling_price ?? 0,
          stock: p.quantity ?? 0,
        }));

        setProducts(mapped);
      } catch {
        // ignore
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  // Demo-only: allow all users to access the dashboard.
  const allowed = true;

  // Show all navigation tabs for all users (no role-based filtering)
  const navItems = NAV_ITEMS;

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return DEMO_ORDERS.filter((o) => {
      if (orderStatusFilter !== "All" && o.status !== orderStatusFilter) return false;
      if (!q) return true;
      return o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
    });
  }, [orderQuery, orderStatusFilter]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.id, p.name, p.brand, p.category].some((x) => x.toLowerCase().includes(q))
    );
  }, [productQuery, products]);

  const metrics = useMemo(() => {
    const revenue = DEMO_ORDERS.reduce((s, o) => s + o.total, 0);
    const lowStock = products.filter((p) => p.stock <= 5).length;
    return {
      revenue,
      orders: DEMO_ORDERS.length,
      products: products.length,
      lowStock,
    };
  }, [products]);

  if (roleId === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto px-4 mt-10">
          <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">
            Loading admin dashboard…
          </div>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto px-4 mt-10">
          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <div className="text-xl font-semibold text-foreground">Unauthorized</div>
            <div className="text-sm text-muted-foreground">
              Admin area is demo-only and requires an admin role.
            </div>
            <div className="flex gap-2">
              <Button onClick={() => router.push("/")}>Go home</Button>
              <Button variant="outline" onClick={() => router.push("/login")}
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <AddProductModal
        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
        onConfirm={(newProducts, meta) => {
          void refreshProducts();
          window.alert(
            `Receipt confirmed: ${meta.receiptNumber} (${meta.supplier}, ${meta.date})`
          );
        }}
      />

      <EditProductModal
        open={isEditProductOpen}
        productId={editingProductId}
        onOpenChange={(nextOpen) => {
          setIsEditProductOpen(nextOpen);
          if (!nextOpen) setEditingProductId(null);
        }}
        onSaved={() => {
          void refreshProducts();
        }}
      />

      <div className="flex max-w-7xl mx-auto">
        <aside className="w-64 bg-card border-r border-border min-h-screen">
          <nav className="p-6">
            <div className="mb-4">
              <div className="text-sm font-semibold text-foreground">Admin Dashboard</div>
              <div className="text-xs text-muted-foreground">Demo only • No backend calls</div>
            </div>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
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

        <main className="flex-1 p-8 space-y-6">
          {activeTab === "overview" && (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Overview</h1>
                  <p className="text-sm text-muted-foreground">Snapshot for today (demo)</p>
                </div>
                <Badge variant="secondary">Light mode</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-sm text-muted-foreground">Revenue</div>
                  <div className="text-2xl font-semibold text-foreground">{formatCurrency(metrics.revenue)}</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-sm text-muted-foreground">Orders</div>
                  <div className="text-2xl font-semibold text-foreground">{metrics.orders}</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-sm text-muted-foreground">Products</div>
                  <div className="text-2xl font-semibold text-foreground">{metrics.products}</div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="text-sm text-muted-foreground">Low stock</div>
                  <div className="text-2xl font-semibold text-foreground">{metrics.lowStock}</div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-sm font-semibold text-foreground mb-2">Recent orders</div>
                <RecentOrdersTable orders={DEMO_ORDERS.slice(0, 3)} />
              </div>
            </>
          )}

          {activeTab === "orders" && (
            <>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
                  <p className="text-sm text-muted-foreground">Search and filter orders (demo)</p>
                </div>
                <Button onClick={() => window.alert("Demo: export orders")}>Export</Button>
              </div>

              <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    value={orderQuery}
                    onChange={(e) => setOrderQuery(e.target.value)}
                    placeholder="Search by order ID or customer name"
                  />
                </div>
                <div className="w-full md:w-64">
                  <Select
                    value={orderStatusFilter}
                    onValueChange={(v) => setOrderStatusFilter(v as AdminOrderStatus | "All")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Processing">Processing</SelectItem>
                      <SelectItem value="In Transit">In Transit</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <OrdersTable
                  orders={filteredOrders}
                  onView={(orderId) => window.alert(`Demo: open ${orderId}`)}
                />
              </div>
            </>
          )}

          {activeTab === "products" && (
            <>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Product Management</h1>
                  <p className="text-sm text-muted-foreground">Demo list (no backend)</p>
                </div>
                <Button onClick={() => setIsAddProductOpen(true)}>Add Product</Button>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <Input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Search products"
                />
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <ProductsTable
                  products={filteredProducts}
                  onEdit={(id) => {
                    setEditingProductId(id);
                    setIsEditProductOpen(true);
                  }}
                />
              </div>
            </>
          )}

          {activeTab === "inventory" && (
            <>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
                  <p className="text-sm text-muted-foreground">Quick stock overview (demo)</p>
                </div>
                <Button variant="outline" onClick={() => window.alert("Demo: restock")}>Restock</Button>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <InventoryTable products={products} />
              </div>
            </>
          )}

          {activeTab === "employees" && (
            <>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Employee Management</h1>
                  <p className="text-sm text-muted-foreground">Demo roster</p>
                </div>
                <Button onClick={() => window.alert("Demo: add employee")}>Add Employee</Button>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <EmployeesTable
                  employees={DEMO_EMPLOYEES}
                  onEdit={(employeeId) => window.alert(`Demo: edit ${employeeId}`)}
                />
              </div>
            </>
          )}

          {activeTab === "profile" && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
                <p className="text-sm text-muted-foreground">Demo settings only</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Full Name</div>
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Email</div>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Phone</div>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Department</div>
                    <Input
                      value={profile.department}
                      onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => window.alert("Demo: profile saved")}>Save Changes</Button>
                  <Button variant="outline" onClick={() => router.push("/user-dashboard")}
                  >
                    Back to user dashboard
                  </Button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
