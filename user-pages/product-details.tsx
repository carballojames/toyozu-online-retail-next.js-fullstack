"use client";

import React, { JSX, useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Minus,
  Plus,
  Truck,
  Shield,
  RotateCcw,
} from "lucide-react";
import Header from "../app/common/Header";
import Footer from "../app/common/Footer";
import ProductGrid from "@/components/user-components/product-components/ProductGrid";
import { Badge } from "@/components/ui/badge";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";

type FormData = {
  quantity: number;
};

/**
 * Product detail page (client-side) using mock data so you can view the UI
 * without any backend. Drop this file at: app/products/[id]/page.tsx
 */

/* -------- Types -------- */
interface ProductImage {
  id?: number;
  image: string;
}

interface CompatibleCar {
  car_model: {
    car_make: string;
    model_name: string;
  };
  year_start: { year: number };
  year_end: { year: number };
}

interface Product {
  product_id: number;
  name: string;
  brand_name?: string;
  category_name?: string;
  description?: string;
  selling_price: number;
  quantity: number;
  discount?: number;
  rating?: number;
  reviews?: number;
  images?: ProductImage[];
  condition_item?: string;
  compatible_cars?: CompatibleCar[];
}

/* -------- Mock store (template data) -------- */
const MOCK_PRODUCTS: Product[] = [
  {
    product_id: 1,
    name: "Brake Pads Premium",
    brand_name: "Brembo",
    category_name: "Brakes",
    description:
      "Premium ceramic brake pads for improved stopping power and reduced noise.",
    selling_price: 1299.0,
    quantity: 12,
    rating: 4.6,
    reviews: 34,
    condition_item: "New",
    images: [
      { id: 1, image: "/placeholder-product-1.jpg" },
      { id: 2, image: "/placeholder-product-1b.jpg" },
      { id: 3, image: "/placeholder-product-1c.jpg" },
    ],
    compatible_cars: [
      {
        car_model: { car_make: "Toyota", model_name: "Corolla" },
        year_start: { year: 2016 },
        year_end: { year: 2020 },
      },
    ],
  },
  {
    product_id: 2,
    name: "Oil Filter Standard",
    brand_name: "Mann Filter",
    category_name: "Filters",
    description: "Reliable oil filter for most standard engines.",
    selling_price: 299.0,
    quantity: 0,
    rating: 4.1,
    reviews: 12,
    images: [{ id: 1, image: "/placeholder-product-2.jpg" }],
    compatible_cars: [],
  },
  {
    product_id: 3,
    name: "Air Filter Deluxe",
    brand_name: "Bosch",
    category_name: "Filters",
    description: "High-flow air filter for better engine performance.",
    selling_price: 499.0,
    quantity: 5,
    rating: 4.2,
    reviews: 18,
    images: [{ id: 1, image: "/placeholder-product-3.jpg" }],
    compatible_cars: [],
  },
];

export default function ProductDetailPage(): JSX.Element {
  const params = useParams();
  const rawId = params?.id;
  const id = rawId ? Number(rawId) : NaN;

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"description" | "specifications">(
    "description",
  );

  useEffect(() => {
    // load product from mock store based on id
    const found = MOCK_PRODUCTS.find((p) => p.product_id === id) || null;
    setProduct(found);
    setSelectedImage(0);
    // reset form quantity is handled by form defaultValues
  }, [id]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { quantity: 1 } });

  const watchedQuantity = watch("quantity");

  const incrementQuantity = (): void => {
    if (!product) return;
    const next = Math.min((watchedQuantity as number) + 1, product.quantity);
    setValue("quantity", next);
  };

  const decrementQuantity = (): void => {
    if (!product) return;
    const next = Math.max((watchedQuantity as number) - 1, 1);
    setValue("quantity", next);
  };

  const onSubmit: SubmitHandler<FormData> = (data) => {
    if (!product) return;
    const schema = z.object({
      quantity: z.number().int().min(1, "Minimum 1").max(product.quantity, `Maximum ${product.quantity}`),
    });

    try {
      const parsed = schema.parse({ quantity: Number(data.quantity) });
      console.log("Add to cart (mock):", { product_id: product.product_id, quantity: parsed.quantity });
      alert(`(Mock) Added ${parsed.quantity} × ${product.name} to cart`);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const first = err.issues[0];
        setError("quantity", { type: "manual", message: first.message });
      }
    }
  };

  if (!product) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div>Product not found or loading...</div>
      </div>
    );
  }

  // product is non-null here; extract optional fields for safer usage
  const discount = (product as Product & { discount?: number }).discount;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="w-[1300px] mx-auto px-4 mt-4 mb-4">
        <nav className="text-sm text-gray-600" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <span className="text-primary hover:underline cursor-pointer">
                {product.category_name}
              </span>
            </li>
            <li className="text-gray-500">›</li>
            <li>
              <span className="text-primary hover:underline cursor-pointer">
                {product.brand_name}
              </span>
            </li>
            <li className="text-gray-500">›</li>
            <li>
              <span className="text-gray-800 font-medium">{product.name}</span>
            </li>
          </ol>
        </nav>
      </div>

      <div className="w-[1300px] mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white p-4 rounded-lg shadow-sm">
          {/* Left: Images */}
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg flex items-center justify-center w-[500px] h-[400px]">
              {product.images && product.images.length > 0 ? (
                // plain <img> used so external/local paths are simple
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
                    selectedImage === index ? "border-primary" : "border-gray-200"
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-sm text-gray-600 mb-2">
                {product.brand_name} • {product.category_name}
              </p>

              <div className="flex items-center gap-1 mb-2">
                <div className="flex items-center gap-2">
                  {discount && discount > 0 ? (
                    <>
                      <Badge variant="primary" className="text-sm font-bold">
                        ₱{(product.selling_price * (1 - discount / 100)).toFixed(2)}
                      </Badge>
                      <span className="text-xs text-muted line-through">₱{Number(product.selling_price).toFixed(2)}</span>
                    </>
                  ) : (
                    <Badge variant="primary" className="text-sm font-bold">₱{Number(product.selling_price).toFixed(2)}</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4 mb-4">
                <span className="text-3xl font-bold text-primary">₱{discount ? (product.selling_price * (1 - discount / 100)).toFixed(2) : product.selling_price}</span>
                <span className="text-green-600 font-medium">✓ In Stock ({product.quantity} available)</span>
              </div>
            </div>

            {/* Quantity controls */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Quantity:</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button type="button" onClick={decrementQuantity} className="p-2 hover:bg-gray-100 transition-colors" disabled={(watchedQuantity as number) <= 1}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    {...register("quantity", { valueAsNumber: true })}
                    className="px-4 py-2 font-medium w-16 text-center"
                    type="number"
                    min={1}
                    max={product.quantity}
                  />
                  <button type="button" onClick={incrementQuantity} className="p-2 hover:bg-gray-100 transition-colors" disabled={(watchedQuantity as number) >= product.quantity}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-gray-600">Max: {product.quantity} pieces</span>
              </div>
              {errors.quantity && <p className="text-sm text-destructive mt-2">{errors.quantity.message}</p>}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <div className="flex flex-col gap-3">
                <button type="button" onClick={() => handleSubmit(onSubmit)()} className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg font-semibold hover:bg-primary-container transition-colors flex items-center justify-center space-x-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Add to Cart</span>
                </button>

                <button className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
                  Buy Now
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Truck className="w-5 h-5 text-primary" />
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="w-5 h-5 text-primary" />
                <span>2 Year Warranty</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <RotateCcw className="w-5 h-5 text-primary" />
                <span>30-Day Returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: description / specifications */}
        <div className="mt-16 bg-white p-8 rounded-lg shadow-sm">
          <nav className="flex space-x-8">
              {['description', 'specifications'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "description" | "specifications")}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="py-8 bg-white rounded-lg">
            {activeTab === "description" && (
              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold mb-4">Product Description</h3>
                <p className="text-gray-700 mb-4">{product.description || "No description available."}</p>
              </div>
            )}

            {activeTab === "specifications" && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Technical Specifications</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Brand:</span>
                      <span>{product.brand_name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Category:</span>
                      <span>{product.category_name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Condition:</span>
                      <span>{product.condition_item || "-"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Stock:</span>
                      <span>{product.quantity}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="py-2 border-b">
                      <span className="font-medium block mb-1">Compatible Vehicles:</span>
                      {product.compatible_cars && product.compatible_cars.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {product.compatible_cars.map((c, i) => (
                            <li key={`compat-${i}`}>
                              {c.car_model.car_make} {c.car_model.model_name} ({c.year_start.year} – {c.year_end.year})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Reviews */}
        <div className="py-8 rounded-lg mt-[30px]">
          <h3 className="text-xl font-semibold mb-4">Customer Reviews</h3>
          <p className="text-gray-500">No reviews yet.</p>
        </div>

        {/* Related / Related products */}
        <section className="">
            <div className="w-[1300px]">
            <h2 className="text-2xl font-bold text-primary text-justify mb-5">Related Products</h2>
            <ProductGrid />
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}