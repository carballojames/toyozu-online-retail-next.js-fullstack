"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import ProductsTable from "./tables/ProductsTable";
import type { AdminProduct } from "../admin-dashboard.types";

export default function ProductPage({
    productQuery,
    onProductQueryChange,
    products,
    onAddProduct,
    onEditProduct,
}: {
    productQuery: string;
    onProductQueryChange: (next: string) => void;
    products: AdminProduct[];
    onAddProduct: () => void;
    onEditProduct: (id: string) => void;
}): ReactNode {
    return (
        <>
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Product Management</h1>
                    <p className="text-sm text-muted-foreground">Manage your product catalog</p>
                </div>
                <Button onClick={onAddProduct}>Add Product</Button>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
                <Input
                    value={productQuery}
                    onChange={(e) => onProductQueryChange(e.target.value)}
                    placeholder="Search products"
                />
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
                <ProductsTable
                    products={products}
                    onEdit={(id) => {
                        onEditProduct(id);
                    }}
                />
            </div>
        </>
    );
}
