"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, ShoppingBag, UserRoundCog, Wrench } from "lucide-react";

import AdminHeader from "./admin-dashboard-components/common/AdminHeader";
import { Button } from "@/components/ui/button";

import AddProductModal from "./admin-dashboard-components/modals/AddProductModal";
import AdminAside from "./admin-dashboard-components/common/AdminAside";
import EditProductModal from "./admin-dashboard-components/modals/EditProductModal";
import EditUserModal from "./admin-dashboard-components/modals/EditUserModal";

import InventoryPage from "./admin-dashboard-components/inventory";
import OrdersPage from "./admin-dashboard-components/orders";
import ProductPage from "./admin-dashboard-components/product";
import UserPage from "./admin-dashboard-components/user";
import { type AdminUserRow } from "./admin-dashboard-components/tables/UsersTable";

import type {
  AdminProduct,
  AdminTabId,
  NavItem,
  Permission,
  RoleId,
} from "./admin-dashboard.types";

const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  0: [
    "VIEW_ANALYTICS",
    "VIEW_ORDERS",
    "MANAGE_PRODUCTS",
    "MANAGE_INVENTORY",
    "MANAGE_EMPLOYEES",
    "MANAGE_USERS",
    "EDIT_PROFILE",
  ],
  1: [
    "VIEW_ANALYTICS",
    "VIEW_ORDERS",
    "MANAGE_PRODUCTS",
    "MANAGE_INVENTORY",
    "MANAGE_EMPLOYEES",
    "MANAGE_USERS",
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
  {
    id: "orders",
    label: "Orders",
    icon: <ShoppingBag />,
    permission: "VIEW_ORDERS",
  },
  {
    id: "products",
    label: "Product ",
    icon: <Wrench /> ,
    permission: "MANAGE_PRODUCTS",
  },
  { id: "inventory", label: "Inventory", icon: <Package />, permission: "MANAGE_INVENTORY" },
  {
    id: "users",
    label: "Users",
    icon: <UserRoundCog />,
    permission: "MANAGE_USERS",
  },
];

export default function AdminDashboardClient({
  initialTab = "products",
}: {
  initialTab?: AdminTabId;
}) {
  const router = useRouter();
  const userSearchInputRef = useRef<HTMLInputElement | null>(null);

  const [roleId, setRoleId] = useState<RoleId | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTabId>(initialTab);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState<string>("");

  const [userQuery, setUserQuery] = useState<string>("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersError, setUsersError] = useState<string>("");
  const [isUsersLoading, setIsUsersLoading] = useState<boolean>(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [products, setProducts] = useState<AdminProduct[]>([]);

  const loadUsers = async (q?: string): Promise<void> => {
    try {
      setIsUsersLoading(true);
      setUsersError("");

      const params = new URLSearchParams();
      if (q && q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as { data?: AdminUserRow[]; error?: string };
      if (!res.ok || !Array.isArray(json.data)) {
        setUsersError(json.error || "Failed to fetch users");
        return;
      }

      setUsers(json.data);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Failed to fetch users");
    } finally {
      setIsUsersLoading(false);
    }
  };

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
    if (roleId === null) return;
    if (!hasPermission(roleId, "MANAGE_USERS")) return;
    void loadUsers();
  }, [roleId]);

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

  // TODO: Gate this route with real auth/authorization.
  const allowed = true;

  // Show all navigation tabs for all users (no role-based filtering)
  const navItems = NAV_ITEMS;

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.id, p.name, p.brand, p.category].some((x) => x.toLowerCase().includes(q))
    );
  }, [productQuery, products]);

  if (roleId === null) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader />
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
      <div className="min-h-screen bg-primary-background">
        <AdminHeader />
        <div className="max-w-5xl mx-auto px-4 mt-10">
          <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
            <div className="text-xl font-semibold text-foreground">Unauthorized</div>
            <div className="text-sm text-muted-foreground">You do not have access to the admin dashboard.</div>
            <div className="flex gap-2">
              <Button onClick={() => router.push("/")}>Go home</Button>
              <Button variant="outline" onClick={() => router.push("/login")}>
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-background flex">
      <AdminAside items={navItems} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 min-w-0 flex flex-col">
        <AdminHeader
          onSearchClick={() => {
            setActiveTab("users");
            requestAnimationFrame(() => userSearchInputRef.current?.focus());
          }}
        />

      <AddProductModal
        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
        onConfirm={() => {
          void refreshProducts();
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

      <EditUserModal
        open={isEditUserOpen}
        userId={editingUserId}
        onOpenChange={(nextOpen) => {
          setIsEditUserOpen(nextOpen);
          if (!nextOpen) setEditingUserId(null);
        }}
        onSaved={() => {
          void loadUsers(userQuery);
        }}
      />

        <main className="flex-1 p-8 space-y-6">
          {activeTab === "orders" ? <OrdersPage /> : null}

          {activeTab === "products" ? (
            <ProductPage
              productQuery={productQuery}
              onProductQueryChange={setProductQuery}
              products={filteredProducts}
              onAddProduct={() => setIsAddProductOpen(true)}
              onEditProduct={(id) => {
                setEditingProductId(id);
                setIsEditProductOpen(true);
              }}
            />
          ) : null}

          {activeTab === "inventory" ? (
            <InventoryPage
              products={products}
              onRestock={() => {
                void refreshProducts();
              }}
            />
          ) : null}

          {activeTab === "users" ? (
            <UserPage
              userSearchInputRef={userSearchInputRef}
              userQuery={userQuery}
              onUserQueryChange={setUserQuery}
              isUsersLoading={isUsersLoading}
              usersError={usersError}
              users={users}
              onSearch={() => {
                void loadUsers(userQuery);
              }}
              onReset={() => {
                setUserQuery("");
                void loadUsers();
              }}
              onRowClick={(userId) => {
                setEditingUserId(userId);
                setIsEditUserOpen(true);
              }}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
