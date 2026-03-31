"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { StaticImageData } from "next/image";

import ToyozuGIF from "@/assets/New.jpg";
import Header from "@/app/common/Header";
import Footer from "@/app/common/Footer";
import ProductGrid from "@/components/user-components/product-components/ProductGrid";
import { ShieldUser, Truck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useBrandsQuery } from "@/hooks/product/use-brands-query";
import { useCategoryPageSize } from "@/hooks/product/use-category-page-size";
import { useCarSelection } from "@/hooks/product/use-car-selection";

import type { LandingClientProps } from "@/app/landing/types";

function getBrandWeightClass(productCount: number): string {
  if (productCount >= 50) return "font-extrabold";
  if (productCount >= 20) return "font-bold";
  if (productCount >= 10) return "font-semibold";
  return "font-medium";
}
const features = [
  {
    icon: ShieldUser,
    title: "Services",
    description:
      "We provide reliable and secure services designed to meet your business needs efficiently.",
  },
  {
    icon: Truck,
    title: "Shipping",
    description:
      "Fast and dependable shipping solutions to ensure your products arrive safely and on time.",
  },
  {
    icon: Wrench,
    title: "Support",
    description:
      "Our dedicated support team is always ready to assist you with any concerns or technical issues.",
  },
];

export default function Landing({
  initialProducts,
  categories,
  carMakes,
  carModels,
  years,
}: LandingClientProps) {
  const router = useRouter();
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const categoryPageSize = useCategoryPageSize();
  const { data: brands = [], isPending: loadingBrands } = useBrandsQuery();
  const {
    selectedMake,
    setSelectedMake,
    selectedBaseModel,
    setSelectedBaseModel,
    selectedVariant,
    setSelectedVariant,
    selectedModelId,
    uniqueBaseModels,
    uniqueVariants,
  } = useCarSelection(carModels);
  const NO_VARIANT_VALUE = "__no_variant__";
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [showLoginDialog, setShowLoginDialog] = useState<boolean>(false);





  const handleSearch = async (): Promise<void> => {
    const isLoggedIn = typeof window !== "undefined" && !!localStorage.getItem("access_token");
    if (!isLoggedIn) {
      setShowLoginDialog(true);
      return;
    }

    const q = new URLSearchParams();
    if (selectedModelId) q.set("model_id", selectedModelId);
    if (selectedYear) q.set("year", selectedYear);
    router.push(`/products?${q.toString()}`);
  };

  const handleBrandClick = (brandName: string) => {
    const isLoggedIn =
      typeof window !== "undefined" && !!localStorage.getItem("access_token");
    if (!isLoggedIn) {
      setShowLoginDialog(true);
      return;
    }
    router.push(`/products?brand=${encodeURIComponent(brandName)}`);
  };

  const displayedCategories = showAllCategories ? categories : categories.slice(0, categoryPageSize);

  return (
    <div className="min-h-screen bg-surface  mx-auto ">
      <Header />
      <section className="flex items-center w-full h-screen overflow-hidden p-80">
        <img
          src={(ToyozuGIF as StaticImageData).src}
          alt="Toyozu Promo GIF"
          className="absolute inset-0 w-full h-80 md:h-[500px] object-cover z-0 blur-sm"
        />

        <div className="relative flex flex-col justify-center items-center h-full bg-opacity-50">
          <div className="px-4 sm:px-6 lg:px-15 py-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 text-primary-foreground drop-shadow-sm">
                Find Parts for Your Vehicle
              </h2>
              <p className="text-primary-foreground drop-shadow-sm">
                Select your car details to find compatible parts
              </p>
              <div className="w-24 h-1  mx-auto mt-4 rounded-full" />
            </div>

            <div className="w-full max-w-4xl p-6 rounded-lg shadow-lg flex-col flex justify-between items-start gap-6 bg-surface text-surface-foreground mx-auto">
              <div className="w-full">
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Car Brand
                    </label>
                    <Select
                      value={selectedMake || undefined}
                      onValueChange={(value) => {
                        setSelectedMake(value);
                        setSelectedBaseModel("");
                        setSelectedVariant("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {carMakes.map((make) => (
                          <SelectItem key={String(make.car_id)} value={String(make.car_id)}>
                            {make.make}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Car Model
                    </label>
                    <Select
                      value={selectedBaseModel || undefined}
                      onValueChange={setSelectedBaseModel}
                      disabled={!selectedMake}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Base Model" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueBaseModels.map((base) => (
                          <SelectItem key={base} value={base}>
                            {base}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Variant
                    </label>
                    <Select
                      value={(selectedVariant ? selectedVariant : NO_VARIANT_VALUE) || undefined}
                      onValueChange={(value) => {
                        setSelectedVariant(value === NO_VARIANT_VALUE ? "" : value);
                      }}
                      disabled={!selectedBaseModel}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Variant (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_VARIANT_VALUE}>(No variant)</SelectItem>
                        {uniqueVariants
                          .filter((v) => v)
                          .map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Year Model
                    </label>
                    <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!selectedModelId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={String(y.year_id)} value={String(y.year)}>
                            {y.year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="lg:col-span-4 flex justify-center mt-4">
                  <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={!selectedModelId}
                    className="px-8 py-3 rounded-lg font-semibold hover:scale-105 transition-all shadow-lg flex items-center space-x-2 bg-primary text-primary-foreground"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Find Compatible Parts</span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col justify-center text-center rounded-lg w-full text-muted-foreground bg-muted/10">
                <p className="text-sm leading-relaxed ">
                  Quick Tip: Select your vehicle’s brand, model, and year to instantly find parts compatible with your car.
                </p> 
              </div>
            </div>
          </div>
            <section className="py-12 px-4 ">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                {features.map(({ icon: Icon, title, description }) => (
                  <div
                    key={title}
                    className="bg-background rounded-lg shadow-md p-6 flex flex-col items-center gap-3"
                  >
                    <Icon className="w-10 h-10 text-primary" />
                    <h3 className="text-lg font-semibold text-primary">{title}</h3>
                    <p className="text-sm text-muted-foreground ">{description}</p>
                  </div>
                ))}
              </div>
          </section>
        </div>
      </section>

        <section className="px-70">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-15">
          <div className="py-4 text-center">
            <h2 className="text-2xl font-medium text-foreground tracking-tight">Categories</h2>
          </div>

          <div className="grid grid-cols-7 gap-4 ">
            {displayedCategories.map((category) => {
              return (
                <Link
                  key={category.id}
                  href={`/products/category/${encodeURIComponent(category.name)}`}
                  className="group relative w-full px-4 py-3 rounded-md flex items-center justify-center font-semibold hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-lg bg-background border border-border overflow-hidden"
                >
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <span className="relative text-sm z-10 text-center text-foreground group-hover:text-primary transition-colors duration-300">
                    {category.name}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Button
              variant="ghost"
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="text-muted-foreground font-medium hover:text-primary hover:bg-primary/5 rounded-full px-6 transition-all duration-300"
            >
              {showAllCategories ? "Show Less" : "View All Categories"}
            </Button>
          </div>
        </div>
      </section>

      <section className="px-70 py-12">
        <div className="max-w-[1320px] w-full mx-auto flex justify-center items-center flex-col px-4 sm:px-6 lg:px-15">
          <div className="py-4">
            <h2 className="text-2xl font-medium italic  text-center ">Explore </h2>
          </div>
          
          <ProductGrid initialProducts={initialProducts} showMoreButton={true} columns={5} />
        </div>
      </section>

      <Footer />

      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Login Required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to be logged in to search for products. Please log in to continue.
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
