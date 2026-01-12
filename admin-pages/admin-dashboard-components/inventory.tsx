"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

import InventoryTable from "./tables/InventoryTable";
import type { AdminProduct } from "../admin-dashboard.types";

export default function InventoryPage({
  products,
  onRestock,
}: {
  products: AdminProduct[];
  onRestock: () => void;
}): ReactNode {
  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">Quick stock overview</p>
        </div>
        <Button variant="outline" onClick={onRestock}>
          Restock
        </Button>
      </div>
      <div className="bg-card border border-border rounded-xl p-4">
        <InventoryTable products={products} />
      </div>
    </>
  );
}
