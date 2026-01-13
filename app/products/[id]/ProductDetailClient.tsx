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
import { ProductDetail, CompatibilityRow, ProductImage } from "./types";

import { ProductCard } from "./types";



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

    // Logged-in users: persist cart in DB.
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
      const existing = safeParseJson<unknown>(
        localStorage.getItem(CART_STORAGE_KEY),
      );
      const items = Array.isArray(existing) ? (existing as any[]) : [];

      const idx = items.findIndex(
        (it) => String(it?.product) === String(product.product_id),
      );
      if (idx >= 0) {
        const prevQty = Number(items[idx]?.quantity ?? 1);
        items[idx] = { ...items[idx], quantity: Math.max(1, prevQty + quantity) };
      } else {
        if (items.length >= 30) {
          alert("Cart limit reached (30 items). Remove an item to add more.");
          return;
        }
        items.push({
          product: String(product.product_id),
          product_name: product.name,
          product_image: product.images?.[0]?.image,
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
    <div className="min-h-screen bg-surface text-foreground">
      <Header />
      {/* Breadcrumb */}
      <div className="w-[1300px] mx-auto px-4 mt-20 mb-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-surface p-6 rounded-lg shadow-sm">
          {/* Left: Images */}
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg flex items-center justify-center w-[500px] h-[400px]">
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

          {/* Right: Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {product.name}
              </h1>
              <p className="text-sm text-muted-foreground mb-2">
                {product.brand_name} • {product.category_name}
              </p>

              <div className="flex items-center space-x-4 mb-4">
                <Badge variant="primary">₱{product.selling_price}</Badge>
                <span className="text-success font-medium">
                  ✓ In Stock ({product.quantity} available)
                </span>
              </div>
            </div>

            {/* Quantity controls */}
            <div>
              <h3 className="font-medium text-foreground mb-2">Quantity:</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-border rounded-lg">
                  <button
                    onClick={decrementQuantity}
                    className="p-2 hover:bg-muted transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 font-medium">{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    className="p-2 hover:bg-muted transition-colors"
                    disabled={quantity >= product.quantity}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-muted-foreground">
                  Max: {product.quantity} pieces
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <div className="flex flex-col gap-3">
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleAddToCart}
                  className="w-full"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>

                <Button variant="secondary" size="lg" className="w-full">
                  Buy Now
                </Button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Truck className="w-5 h-5 text-primary" />
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="w-5 h-5 text-primary" />
                <span>2 Year Warranty</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <RotateCcw className="w-5 h-5 text-primary" />
                <span>30-Day Returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: description / specifications */}
        <div className="mt-16 bg-card p-8 rounded-lg shadow-sm">
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

          <div className="py-8 bg-card rounded-lg">
            {activeTab === "description" && (
              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold mb-4 text-foreground">
                  Product Description
                </h3>
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
                <h3 className="text-xl font-semibold mb-4 text-foreground">
                  Technical Specifications
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="font-medium">Brand:</span>
                      <span className="text-muted-foreground">
                        {product.brand_name}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="font-medium">Category:</span>
                      <span className="text-muted-foreground">
                        {product.category_name}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="font-medium">Stock:</span>
                      <span className="text-muted-foreground">
                        {product.quantity}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="font-medium">Car Compatibility:</div>
                    {compatibility.length > 0 ? (
                      <div className="space-y-2">
                        {compatibility.map((c) => (
                          <div
                            key={c.id}
                            className="text-sm text-muted-foreground border-b border-border pb-2"
                          >
                            <div className="font-medium text-foreground">
                              {c.make} {c.model_name}
                            </div>
                            <div>
                              {(c.start_year ?? "?") + " - " + (c.end_year ?? "?")}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No compatibility specified.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related / Related products */}
        <section className="">
          <div className="w-[1300px]">
            <h2 className="text-2xl font-bold text-primary text-justify mb-5">
              Related Products
            </h2>
            <ProductGrid initialProducts={relatedProducts} />
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
