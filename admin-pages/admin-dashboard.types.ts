export type Permission =
  | "VIEW_ANALYTICS"
  | "VIEW_ORDERS"
  | "MANAGE_PRODUCTS"
  | "MANAGE_INVENTORY"
  | "MANAGE_EMPLOYEES"
  | "EDIT_PROFILE";

// 0 is a demo-only superuser role.
export type RoleId = 0 | 1 | 2 | 3 | 4;

export type AdminTabId =
  | "overview"
  | "orders"
  | "products"
  | "inventory"
  | "employees"
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
  | "Processing"
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
