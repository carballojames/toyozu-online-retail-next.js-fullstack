"use client";

import React, { JSX, useState } from "react";

import {
  ShoppingCart,
  Minus,
  Plus,
  Truck,
  Shield,
  RotateCcw,
} from "lucide-react";

import Footer from "../../common/Footer";
import ProductGrid from "@/components/user-components/product-components/ProductGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/app/common/Header";
import { ProductDetail, CompatibilityRow, ProductImage, ProductCard } from "./types";

const CART_STORAGE_KEY = "cartItems";

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export default function ProductDetailClient({
  product,
  compatibility,
  relatedProducts,
}: {
  product: ProductDetail;
  compatibility: CompatibilityRow[];
  relatedProducts: ProductCard[];
}): JSX.Element {
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"description" | "specifications">(
    "description",
  );

  const incrementQuantity = (): void => {
    if (quantity < product.quantity) setQuantity((q) => q + 1);
  };

  const decrementQuantity = (): void => {
    if (quantity > 1) setQuantity((q) => q - 1);
  };

  const handleAddToCart = async (): Promise<void> => {
    const rawUserId =
      typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    const userId = rawUserId ? Number(rawUserId) : NaN;

    if (Number.isFinite(userId) && userId > 0) {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            userId,
            productId: product.product_id,
            quantity,
          }),
        });

        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          alert(json.error || "Failed to add to cart");
          return;
        }

        window.dispatchEvent(new Event("cart:updated"));
        alert(`Added ${quantity} × ${product.name} to cart`);
        return;
      } catch {
        alert("Failed to add to cart");
        return;
      }
    }

    // Guest fallback: localStorage.
    try {
      type CartItem = {
        product_id: number;
        name: string;
        brand_name?: string;
        category_name?: string;
        selling_price: number;
        quantity: number;
        price_at_addition: number;
      };

      const items = safeParseJson<CartItem[]>(
        typeof window !== "undefined" ? localStorage.getItem(CART_STORAGE_KEY) : null,
      ) ?? [];

      const existing = items.find((i) => i.product_id === product.product_id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({
          product_id: product.product_id,
          name: product.name,
          brand_name: product.brand_name,
          category_name: product.category_name,
          selling_price: product.selling_price,
          quantity,
          price_at_addition: product.selling_price,
        });
      }

      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event("cart:updated"));
      alert(`Added ${quantity} × ${product.name} to cart`);
    } catch {
      alert("Failed to add to cart");
    }
  };

  return (
    <div className="min-h-screen bg-primary-background text-foreground">
      <Header />
       <div className="w-[1300px] mx-auto px-4 mt-4 mb-4">
        <nav className="text-sm text-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <span className="text-primary hover:underline cursor-pointer">
                Home
              </span>
            </li>
            <li className="text-foreground">›</li>
            <li>
              <span className="text-primary hover:underline cursor-pointer">
                {product.category_name ?? "Products"}
              </span>
            </li>
            <li className="text-foreground">›</li>
            <li>
              <span className="text-primary hover:underline cursor-pointer">
                {product.brand_name ?? "Brand"}
              </span>
            </li>
            <li className="text-foreground">›</li>
            <li>
              <span className="text-foreground font-medium">{product.name}</span>
            </li>
          </ol>
        </nav>
      </div>

      <div className="w-[1300px] mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-surface p-6 rounded-2xl shadow-sm">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl flex items-center justify-center w-[500px] h-[400px]">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage].image}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="w-full h-[400px] bg-gray-200 flex items-center justify-center text-gray-600">
                  No Image
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1">
              {(product.images || []).slice(0, 5).map((img, index) => (
                <button
                  key={img.id ?? index}
                  onClick={() => setSelectedImage(index)}
                  className={`border-2 rounded-lg overflow-hidden w-[100px] h-[100px] ${
                    selectedImage === index ? "border-primary" : "border-border"
                  }`}
                >
                  <img
                    src={img.image}
                    alt={`${product.name} ${index}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-secondary  mb-2">{product.name}</h1>
              <p className="text-muted-foreground">{product.brand_name ?? ""}</p>
            </div>

            <div className="text-3xl font-bold text-primary">
              ₱{Number(product.selling_price).toFixed(2)}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-2xl overflow-hidden ">
                <button
                  className="px-3 py-2 hover:bg-muted"
                  onClick={decrementQuantity}
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-full text-muted-foreground font-light" />
                </button>
                <div className="px-4 py-2 min-w-[48px] text-center">{quantity}</div>
                <button
                  className="px-3 py-2 hover:bg-muted"
                  onClick={incrementQuantity}
                  aria-label="Increase quantity"
                >
                  <Plus className="w-full" />
                </button>
              </div>

              <Button onClick={() => void handleAddToCart()} className="flex-1">
                <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Truck className="w-5 h-5 text-primary" />
                <span>Fast Delivery</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="w-5 h-5 text-primary" />
                <span>Genuine Parts</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <RotateCcw className="w-5 h-5 text-primary" />
                <span>30-Day Returns</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-surface p-8 rounded-2xl shadow-sm">
          <nav className="flex space-x-8">
            {(["description", "specifications"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="py-8 bg-surface rounded-2xl">
            {activeTab === "description" && (
              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold mb-4 text-secondary">Product Description: </h3>
                {(product.description || "No description available.")
                  .split(/\n+/)
                  .filter((p) => p.trim().length > 0)
                  .map((p, i) => (
                    <p key={i} className="text-muted-foreground mb-4">
                      {p}
                    </p>
                  ))}
              </div>
            )}

            {activeTab === "specifications" && (
              <div>
                <div className="text-xl font-semibold mb-4 text-secondary">Car Compatibility:</div>
                {compatibility.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {compatibility.map((c) => (
                      <div key={c.id} className="text-sm text-muted-foreground border-b border-border pb-2">
                        <div className="font-medium text-foreground">{c.make} {c.model_name}</div>
                        <div>{(c.start_year ?? "?") + " - " + (c.end_year ?? "?")}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-2">No compatibility specified.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <ProductGrid initialProducts={relatedProducts} showMoreButton={false} columns={4} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
