"use client";

import React, { JSX, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { ProductGridProps } from "@/app/products/[name]/types";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function ProductGrid({
  initialProducts,
  showMoreButton = false,
  moreHref = "/products",
  category,
  columns = 5,
  loading = false,
}: ProductGridProps & {
  category?: string;
  columns?: number;
  loading?: boolean;
}): JSX.Element {
  const router = useRouter();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const products = initialProducts ?? [];
  const visibleCount = 20;

  const handleProductClick = (e: React.MouseEvent) => {
    const isLoggedIn =
      typeof window !== "undefined" && !!localStorage.getItem("access_token");
    if (!isLoggedIn) {
      e.preventDefault();
      setShowLoginDialog(true);
    }
  };

  const lgColsClass =
    columns === 1
      ? "lg:grid-cols-1"
      : columns === 2
      ? "lg:grid-cols-2"
      : columns === 3
      ? "lg:grid-cols-3"
      : columns === 4
      ? "lg:grid-cols-4"
      : columns === 5
      ? "lg:grid-cols-5"
      : "lg:grid-cols-6";

  const normalizeImageSrc = (src: unknown): string => {
    const s = typeof src === "string" ? src.trim() : "";
    return s ? s : "/placeholder.svg";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <Spinner className="w-12 h-12 text-primary" />
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-6 text-gray-500">No products found</div>
    );
  }

  // If category is provided, filter products by category_name (case-insensitive)
  const filteredProducts = category
    ? products.filter(
        (p) => (p.category_name ?? "").toLowerCase() === category.toLowerCase(),
      )
    : products;

  const visibleProducts = showMoreButton
    ? filteredProducts.slice(0, visibleCount)
    : filteredProducts;

  return (
    <div className="flex flex-col items-center mb-5 w-full">
      {/* Product Grid */}
      <div
        className={`grid grid-cols-2 md:grid-cols-3 ${lgColsClass} gap-3 sm:gap-4 w-full max-w-[1270px] px-4 sm:px-0`}
      >
        {visibleProducts.map((product) => {
          const firstImage = normalizeImageSrc(
            product.images?.[0]?.image ?? product.images?.[0]?.url,
          );

          const isExternalImage = /^https?:\/\//i.test(firstImage);

          return (
            <Link
              key={product.product_id}
              href={`/products/${encodeURIComponent(product.name)}`}
              onClick={handleProductClick}
              className="bg-surface rounded-lg shadow-sm border hover:border-primary transition-shadow block h-full"
            >
              {/* Image */}
              <div className="relative justify-center flex bg-transparent rounded-t-lg w-full h-40 sm:h-48 md:h-[220px]">
                <Image
                  src={firstImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover rounded-t-lg"
                  unoptimized={isExternalImage}
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
                    <div className="flex flex-wrap items-center gap-2">
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
      {showMoreButton && !category && visibleCount < filteredProducts.length && (
        <div className="mt-6">
          <Button asChild variant="outline" className="px-8 py-2 rounded-full font-semibold max-w-[120px]">
            <Link href={moreHref}>More</Link>
          </Button>
        </div>
      )}

      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Login Required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to be logged in to view product details. Please log in to
              continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/auth/login")}>
              Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}