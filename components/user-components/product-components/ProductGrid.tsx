"use client";

import React, { JSX, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  columns = 6,
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
      ? "lg:grid-cols-6"
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
        className={`grid grid-cols-2 md:grid-cols-3 ${lgColsClass} gap-2  w-full max-w-[1270px] px-4 sm:px-0`}
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
              className="group flex flex-col bg-background rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-border overflow-hidden h-full"
            >
              {/* Image */}
              <div className="relative w-full aspect-square overflow-hidden ">
                <Image
                  src={firstImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized={isExternalImage}
                />
                {product.discount && product.discount > 0 && (
                  <div className="absolute top-3 left-3  text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-md">
                    -{product.discount}%
                  </div>
                )}
                {typeof product.quantity === "number" && product.quantity <= 0 && (
                  <div className="absolute inset-0 bg-surface/40 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="bg-surface/90 text-surface-foreground px-4 py-1.5 rounded-full font-semibold text-xs shadow-sm">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 flex flex-col grow gap-1.5">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {product.brand_name}
                </div>
                <h3
                  className="font-semibold text-foreground text-sm line-clamp-2 leading-snug group-hover:text-primary transition-colors h-10"
                  title={product.name}
                >
                  {product.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.floor(product.rating || 0)
                            ? "text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground ml-1">
                    {product.rating || 0} ({product.reviews || 0})
                  </span>
                </div>

                {/* Price */}
                <div className="mt-auto pt-2 flex items-baseline gap-2 flex-wrap">
                  {product.discount && product.discount > 0 ? (
                    <>
                      <span className="text-lg font-extrabold text-foreground">
                        ₱{(product.selling_price * (1 - product.discount! / 100)).toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50 font-medium">
                        ₱{Number(product.selling_price).toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-medium text-primary">
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