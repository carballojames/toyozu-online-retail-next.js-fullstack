"use client";

import React, { JSX } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProductCard, ProductGridProps } from "@/app/products/[id]/types";

export default function ProductGrid({
  initialProducts,
  showMoreButton = false,
  moreHref = "/products",
  category,
  columns = 5,
}: ProductGridProps & { category?: string; columns?: number }): JSX.Element {
  const products = initialProducts ?? [];
  const visibleCount = 20;

  if (!products.length) {
    return <div className="text-center py-6 text-gray-500">No products found</div>;
  }


  // If category is provided, filter products by category_name (case-insensitive)
  const filteredProducts = category
    ? products.filter(
        (p) =>
          (p.category_name ?? "").toLowerCase() === category.toLowerCase(),
      )
    : products;

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const lgColsClass =
    columns === 4
      ? "lg:grid-cols-6"
      : columns === 6
        ? "lg:grid-cols-6"
        : columns === 6
          ? "lg:grid-cols-6"
          : "lg:grid-cols-6";

  return (
    <div className="flex flex-col items-center mb-5">
      {/* Product Grid */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 ${lgColsClass} gap-3 w-full max-w-[1270px]`}
      >
        {visibleProducts.map((product) => {
          const firstImage =
            product.images?.[0]?.image ||
            product.images?.[0]?.url ||
            "/placeholder.svg";

          return (
            <Link
              key={product.product_id}
              href={`/product/${product.product_id}`}
              className="bg-surface rounded-lg shadow-sm border hover:border-primary transition-shadow block"
            >
              {/* Image */}
              <div className="relative justify-center flex bg-transparent rounded-t-lg w-full h-[220px]">
                <img
                  src={firstImage}
                  alt={product.name}
                  className="w-full h-[220px] object-cover rounded-t-lg"
                />
                {product.discount && product.discount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 right-2 text-xs font-bold"
                  >
                    -{product.discount}%
                  </Badge>
                )}
                {typeof product.quantity === "number" && product.quantity <= 0 && (
                  <div className="absolute inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center rounded-t-lg">
                    <span className="bg-white text-gray-900 px-3 py-1 rounded font-semibold text-xs">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-3">
                <div className="text-xs text-gray-500 mb-1">
                  {product.brand_name}
                </div>
                <h3
                  className="font-semibold text-gray-900 mb-1 text-sm line-clamp-2 h-[50px]"
                  title={product.name}
                >
                  {product.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating || 0)
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">
                    {product.rating || 0} ({product.reviews || 0})
                  </span>
                </div>

                {/* Price */}
                <div className="mb-2">
                  {product.discount && product.discount > 0 ? (
                    <div className="flex items-center gap-7">
                      <Badge variant="primary" className="text-sm font-bold">
                        ₱{(product.selling_price * (1 - product.discount! / 100)).toFixed(2)}
                      </Badge>
                      <span className="text-xs text-muted line-through">₱{Number(product.selling_price).toFixed(2)}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      ₱{Number(product.selling_price).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Add to cart (UI only) */}
              </div>
            </Link>
          );
        })}
      </div>

      {/* More Button: only show if not filtered and only on landing */}
      {showMoreButton && !category && visibleCount < products.length && (
        <div className="mt-6">
          <Button asChild variant="outline" className="px-8 py-2 rounded-full font-semibold max-w-[120px]">
            <Link href={moreHref}>More</Link>
          </Button>
        </div>
      )}
    </div>
  );
}