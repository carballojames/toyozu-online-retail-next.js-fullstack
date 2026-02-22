"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Car, Package, ShoppingBag, UserRoundCog, Wrench } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import AdminHeader from "../components/admin-components/common/AdminHeader";
import { Button } from "@/components/ui/button";

import AddProductModal from "../components/admin-components/modals/AddProductDialog";
import AdminAside from "../components/admin-components/common/AdminAside";
import EditProductModal from "../components/admin-components/modals/EditProductDialog";
import EditUserModal from "../components/admin-components/modals/EditUserDialog";

import InventoryPage from "../components/admin-components/AdminInventoryManagement";
import OrdersPage from "../components/admin-components/AdminOrdersManagement";
import ProductPage from "../components/admin-components/AdminProductManagement";
import UserPage from "../components/admin-components/AdminUserManagement";
import CarCompatibilityPage from "../components/admin-components/AdminCarCompatibilityManagement";
import OverviewPage from "../components/admin-components/AdminOverviewManagement";
import SalesTrackerPage from "../components/admin-components/AdminSalesTrackerManagement";
import SupplyTrackerPage from "../components/admin-components/AdminSupplyTrackerManagement";
import { ADMIN_PRODUCTS_QUERY_KEY, useAdminProductsQuery } from "@/hooks/admin/use-admin-products-query";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { ADMIN_USERS_QUERY_KEY, useAdminUsersQuery } from "@/hooks/admin/use-admin-users-query";

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
    id: "overview",
    label: "Dashboard",
    icon: <BarChart3 />,
    permission: "VIEW_ANALYTICS",
  },
  {
    id: "orders",
    label: "Orders",
    icon: <ShoppingBag />,
    permission: "VIEW_ORDERS",
  },
  {
    id: "stocks",
    label: "Product ",
    icon: <Wrench /> ,
    permission: "MANAGE_PRODUCTS",
  },
  { id: "inventory", label: "Inventory", icon: <Package />, permission: "MANAGE_INVENTORY" },
  {
    id: "car-compatibility",
    label: "Car Compatibility",
    icon: <Car />,
    permission: "MANAGE_PRODUCTS",
  },
  {
    id: "users",
    label: "Users",
    icon: <UserRoundCog />,
    permission: "MANAGE_USERS",
  },
  {
    id: "sales-tracker",
    label: "Sales Tracker",
    icon: <BarChart3 />,
    permission: "VIEW_ANALYTICS",
  },
  {
    id: "supply-tracker",
    label: "Supply Tracker",
    icon: <Package />,
    permission: "MANAGE_INVENTORY",
  },
];

export default function AdminDashboardClient({
  initialTab = "overview",
}: {
  initialTab?: AdminTabId;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userSearchInputRef = useRef<HTMLInputElement | null>(null);

  const roleId = useAdminRole();
  const [activeTab, setActiveTab] = useState<AdminTabId>(initialTab);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState<string>("");

  const [userQuery, setUserQuery] = useState<string>("");
  const [appliedUserQuery, setAppliedUserQuery] = useState<string>("");
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const canManageUsers = roleId !== null && hasPermission(roleId, "MANAGE_USERS");
  const productsQuery = useAdminProductsQuery();
  const usersQuery = useAdminUsersQuery(appliedUserQuery, canManageUsers);

  const products = productsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const usersError = usersQuery.error instanceof Error ? usersQuery.error.message : "";
  const isUsersLoading = usersQuery.isLoading || usersQuery.isFetching;

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
        onConfirm={(createdProducts) => {
          queryClient.setQueryData<AdminProduct[]>(ADMIN_PRODUCTS_QUERY_KEY, (previous) => {
            const current = previous ?? [];
            const byId = new Map(current.map((product) => [product.id, product]));
            for (const product of createdProducts) {
              byId.set(product.id, product);
            }
            return Array.from(byId.values());
          });
          void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY });
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
          void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY });
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
          void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
        }}
      />

        <main className="flex-1 p-8 space-y-6">
          {activeTab === "overview" ? <OverviewPage /> : null}

          {activeTab === "orders" ? <OrdersPage /> : null}

          {activeTab === "stocks" ? (
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
                void queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY });
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
                setAppliedUserQuery(userQuery);
                void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
              }}
              onReset={() => {
                setUserQuery("");
                setAppliedUserQuery("");
                void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
              }}
              onRowClick={(userId) => {
                setEditingUserId(userId);
                setIsEditUserOpen(true);
              }}
            />
          ) : null}

          {activeTab === "car-compatibility" ? <CarCompatibilityPage /> : null}

          {activeTab === "sales-tracker" ? <SalesTrackerPage /> : null}

          {activeTab === "supply-tracker" ? <SupplyTrackerPage /> : null}
        </main>
      </div>
    </div>
  );
}
