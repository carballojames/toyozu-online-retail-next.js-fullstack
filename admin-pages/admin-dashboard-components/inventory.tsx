"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import InventoryTable from "./tables/InventoryTable";
import type { AdminProduct } from "../admin-dashboard.types";

export default function InventoryPage({
  products,
  onRestock,
}: {
  products: AdminProduct[];
  onRestock: () => void;
}): ReactNode {
  const [draftQuery, setDraftQuery] = useState<string>("");
  const [appliedQuery, setAppliedQuery] = useState<string>("");

  const filtered = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const hay = `${p.id} ${p.name} ${p.brand} ${p.category}`.toLowerCase();
      return hay.includes(q);
    });
  }, [appliedQuery, products]);

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
            onClick={() => setAppliedQuery(draftQuery)}
          >
            Search
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraftQuery("");
              setAppliedQuery("");
            }}
            disabled={!draftQuery && !appliedQuery}
          >
            Reset
          </Button>
          <Button variant="outline" onClick={onRestock}>
            Refresh Stock
          </Button>
        </div>
      </div>
      <div className="bg-surface border border-border rounded-xl p-4">
        <InventoryTable products={filtered} />
      </div>
    </>
  );
}
