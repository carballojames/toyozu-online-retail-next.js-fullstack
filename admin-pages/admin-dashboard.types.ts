export type Permission =
  | "VIEW_ANALYTICS"
  | "VIEW_ORDERS"
  | "MANAGE_PRODUCTS"
  | "MANAGE_INVENTORY"
  | "MANAGE_EMPLOYEES"
  | "MANAGE_USERS"
  | "EDIT_PROFILE";

// 0 is a demo-only superuser role.
export type RoleId = 0 | 1 | 2 | 3 | 4;

export type AdminTabId =
  | "overview"
  | "orders"
  | "products"
  | "inventory"
  | "employees"
  | "users"
  | "profile";

import type { ReactNode } from "react";

export type NavItem = {
  id: AdminTabId;
  label: string;
  icon: ReactNode;
  permission: Permission;
};

export type AdminOrderStatus =
  | "Pending"
  | "Prepare to ship"
  | "Pickup by courier"
  | "Tracking number posted"
  | "In Transit"
  | "Delivered"
  | "Cancelled";

export type AdminOrder = {
  id: string;
  date: string;
  customerName: string;
  total: number;
  status: AdminOrderStatus;
};

export type AdminProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
};

export type Employee = {
  id: string;
  name: string;
  role: "Admin" | "Secretary" | "Employee";
  email: string;
  status: "Active" | "Inactive";
};

export type SupplyReceiptResponse = {
  data?: {
    supplyId: number;
    products: Array<{
      product_id: number;
      name: string;
      selling_price: number | null;
      quantity: number | null;
      brand: { name: string } | null;
      category: { name: string } | null;
    }>;
  };
  error?: string;
};

export type SupplierReceiptLine = {
  id: string;
  name: string;
  brand: string;
  category: string;
  condition: string;
  purchasePrice: string;
  sellingPrice: string;
  quantity: string;
};

export type SupplierReceiptMeta = {
  receiptNumber: string;
  supplier: string;
  date: string;
};

export type LookupsResponse = {
  data?: {
    suppliers: string[];
    brands: string[];
    categories: string[];
    conditions: string[];
  };
};



export type CarCompatibilityLookupResponse = {
  data?: {
    makes: string[];
    years: Array<{ year_id: number; year: number }>;
    models: Array<{ model_id: number; model_name: string; car_id: number }>;
  };
  error?: string;
};

export type ParsedCarModel = {
  model_id: number;
  model_name: string;
  car_id: number;
  base: string;
  variant: string;
  variantKey: string;
};

export type ProductCompatibilityRow = {
  id: number;
  make: string;
  model_name: string;
  model_id: number;
  start_year_id: number;
  end_year_id: number;
  start_year: number | null;
  end_year: number | null;
};

export type ApiProduct = {
  product_id: number;
  name: string;
  description: string | null;
  purchase_price: number | null;
  selling_price: number | null;
  quantity: number | null;
  weight: number | null;
  brand: { name: string } | null;
  category: { name: string } | null;
  product_image: Array<{ id: number; image: string }>;
};

export type Props = {
  open: boolean;
  productId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};