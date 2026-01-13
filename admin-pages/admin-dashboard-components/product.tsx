"use client";

import { useRef } from "react";
import type { ReactNode } from "react";

import { Search } from "lucide-react";

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
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    return (
        <>
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Product Management</h1>
                    <p className="text-sm text-muted-foreground">Manage your product catalog</p>
                </div>
                <Button onClick={onAddProduct}>Add Product</Button>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Input
                        ref={searchInputRef}
                        value={productQuery}
                        onChange={(e) => onProductQueryChange(e.target.value)}
                        placeholder="Search products"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => searchInputRef.current?.focus()}
                        aria-label="Focus search"
                    >
                        <Search className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">Search</span>
                    </Button>
                </div>
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
