"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import InventoryTable from "./tables/AdminInventoryTable";
import type { AdminProduct } from "../../admin-pages/admin-dashboard.types";

export default function InventoryPage({
  products,
  isLoading = false,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  query = "",
  onQueryChange,
  onPageChange,
  onRestock,
}: {
  products: AdminProduct[];
  isLoading?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  query?: string;
  onQueryChange?: (q: string) => void;
  onPageChange?: (page: number) => void;
  onRestock: () => void;
}): ReactNode {
  const [draftQuery, setDraftQuery] = useState<string>(query);

  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">Quick stock overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="Search product (name / SKU / brand / category)"
            className="w-[280px]"
          />
          <Button
            variant="outline"
            onClick={() => onQueryChange?.(draftQuery)}
          >
            Search
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraftQuery("");
              onQueryChange?.("");
            }}
            disabled={!draftQuery && !query}
          >
            Reset
          </Button>
          <Button variant="outline" onClick={onRestock}>
            Refresh Stock
          </Button>
        </div>
      </div>
      <div className="bg-surface border border-border rounded-xl p-4">
        <InventoryTable
          products={products}
          isLoading={isLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={onPageChange}
        />
      </div>
    </>
  );
}
