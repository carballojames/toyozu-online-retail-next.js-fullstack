"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ToyozuGIF from "@/assets/New.jpg";
import Header from "@/app/common/Header";
import Footer from "@/app/common/Footer";
import ProductGrid from "@/components/user-components/product-components/ProductGrid";
import { ShieldUser, Truck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { LandingClientProps } from "@/app/landing/types";

type DbBrand = {
  id: number;
  name: string;
  productCount: number;
};

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

export default function LandingClient({
  initialProducts,
  categories,
  carMakes,
  carModels,
  years,
}: LandingClientProps) {
  const router = useRouter();
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [categoryPageSize, setCategoryPageSize] = useState<number>(10);
  const [brands, setBrands] = useState<DbBrand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState<boolean>(true);
  const [selectedMake, setSelectedMake] = useState<string>("");
  const [selectedBaseModel, setSelectedBaseModel] = useState<string>("");
  const NO_VARIANT_VALUE = "__no_variant__";
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [showLoginDialog, setShowLoginDialog] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const loadBrands = async () => {
      setLoadingBrands(true);
      try {
        const res = await fetch("/api/brands", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const json = (await res.json()) as
          | { data: { brands: DbBrand[] } }
          | { error: string };

        if (!res.ok || !("data" in json)) {
          if (!cancelled) setBrands([]);
          return;
        }

        if (!cancelled) setBrands(Array.isArray(json.data.brands) ? json.data.brands : []);
      } catch {
        if (!cancelled) setBrands([]);
      } finally {
        if (!cancelled) setLoadingBrands(false);
      }
    };

    void loadBrands();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const computeCategoryPageSize = () => {
      // Mobile S: 1 col -> show 4 (2x2). Mobile L/M: 2 cols -> show 4 (2x2).
      // Tablet: 3 cols -> show 6 (3x2). Desktop: show 10.
      const w = window.innerWidth;
      if (w < 768) {
        setCategoryPageSize(4);
      } else if (w < 1024) {
        setCategoryPageSize(6);
      } else {
        setCategoryPageSize(10);
      }
    };

    computeCategoryPageSize();
    window.addEventListener("resize", computeCategoryPageSize);
    return () => window.removeEventListener("resize", computeCategoryPageSize);
  }, []);

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
    const isLoggedIn = typeof window !== "undefined" && !!localStorage.getItem("access_token");
    if (!isLoggedIn) {
      setShowLoginDialog(true);
      return;
    }
    router.push(`/products?brand=${encodeURIComponent(brandName)}`);
  };

  const parsedModels = carModels
    .map((m) => {
      const raw = String(m.model_name ?? "");
      const [base, ...rest] = raw.split("-").map((s) => s.trim());
      const variant = rest.join(" - ").trim();
      return {
        model_id: String(m.model_id),
        car_id: String(m.car_id),
        model_name: raw,
        base: base ?? "",
        variant: variant || "",
      };
    })
    .filter((m) => m.base);

  const baseModelsForMake = parsedModels
    .filter((m) => String(m.car_id) === String(selectedMake))
    .map((m) => m.base);
  const uniqueBaseModels = Array.from(new Set(baseModelsForMake)).sort((a, b) => a.localeCompare(b));

  const variantsForBase = parsedModels
    .filter((m) => String(m.car_id) === String(selectedMake) && m.base === selectedBaseModel)
    .map((m) => m.variant);
  const uniqueVariants = Array.from(new Set(variantsForBase)).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!selectedMake) {
      setSelectedBaseModel("");
      setSelectedVariant("");
      setSelectedModelId("");
      return;
    }
    setSelectedBaseModel("");
    setSelectedVariant("");
    setSelectedModelId("");
  }, [selectedMake]);

  useEffect(() => {
    if (!selectedBaseModel) {
      setSelectedVariant("");
      setSelectedModelId("");
      return;
    }
    setSelectedVariant("");
    setSelectedModelId("");
  }, [selectedBaseModel]);

  useEffect(() => {
    if (!selectedMake || !selectedBaseModel) {
      setSelectedModelId("");
      return;
    }

    const chosen = parsedModels.find(
      (m) =>
        m.car_id === String(selectedMake) &&
        m.base === selectedBaseModel &&
        (m.variant || "") === (selectedVariant || ""),
    );
    setSelectedModelId(chosen?.model_id ?? "");
  }, [parsedModels, selectedMake, selectedBaseModel, selectedVariant]);

  const displayedCategories = showAllCategories ? categories : categories.slice(0, categoryPageSize);

  return (
    <div className="min-h-screen bg-primary-foreground  mx-auto">
      <Header />
      <section className="relative w-full h-screen overflow-hidden">
        <Image
          src={ToyozuGIF}
          alt="Toyozu Promo"
          width={1920}
          height={500}
          priority
          className="absolute inset-0 w-full h-80 md:h-[500px] object-cover z-0 blur-sm"
        />

        <div className="relative flex flex-col justify-center items-center h-full bg-opacity-50">
          <div className="px-4 sm:px-10 py-8">
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
                        setSelectedModelId("");
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span>Find Compatible Parts</span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col justify-center text-center rounded-lg w-full text-muted-foreground bg-muted/10">
                <p className="text-sm leading-relaxed ">
                  Quick Tip: Select your vehicle’s brand, model, and year to instantly find parts
                  compatible with your car.
                </p>
              </div>
            </div>
          </div>
          <section className="py-12 px-4 bg-transparent max-w-[1270px] mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              {features.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="bg-surface rounded-lg shadow-md p-6 flex flex-col items-center gap-3"
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

      <section className="py-12 px-4">
        <div className="max-w-[1270px] mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-secondary">CATEGORIES</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {displayedCategories.map((category) => {
              return (
                <Link
                  key={category.id}
                  href={`/products/category/${encodeURIComponent(category.name)}`}
                  className="w-full px-4 py-3 rounded-2xl flex items-center justify-center space-x-2 font-semibold  hover:scale-105 transition-all duration-200 hover:shadow-lg transform bg-surface text-primary-container-foreground"
                >
                  <span className="text-md text-center italic text-muted-foreground">{category.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="text-muted-foreground font-medium hover:underline transition-all duration-150 hover:scale-105"
            >
              {showAllCategories ? "Show Less" : "More"}
            </button>
          </div>
        </div>
      </section>

      <section id="brands" className="py-12 px-4 bg-transparent">
        <div className="max-w-[1270px] mx-auto px-4">
          <h2 className="text-2xl font-bold text-secondary mb-8">TRUSTED BRANDS</h2>

          <Carousel
            opts={{ align: "start", loop: true }}
            className="w-full max-w-5xl lg:max-w-7xl mx-auto relative"
          >
            <CarouselContent className="-ml-6">
              {(loadingBrands ? [] : brands).map((brand) => (
                <CarouselItem key={brand.name} className="pl-6 basis-full md:basis-1/2 lg:basis-1/3">
                  <div
                    onClick={() => handleBrandClick(brand.name)}
                    className="cursor-pointer p-6 rounded-2xl hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center bg-surface text-surface-foreground"
                  >
                    <div className="text-center">
                      <div
                        className={`text-2xl font-semibold italic tracking-wide ${getBrandWeightClass(brand.productCount)}`}
                      >
                        {brand.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{brand.productCount} products</div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
              {loadingBrands && (
                <CarouselItem className="pl-6 basis-full md:basis-1/2 lg:basis-1/3">
                  <div className="p-6 rounded-lg bg-surface text-surface-foreground border flex justify-center items-center min-h-[140px]">
                    <Spinner className="w-8 h-8 text-primary" />
                  </div>
                </CarouselItem>
              )}
              {!loadingBrands && brands.length === 0 && (
                <CarouselItem className="pl-6 basis-full md:basis-1/2 lg:basis-1/3">
                  <div className="p-6 rounded-lg bg-surface text-surface-foreground border">
                    <div className="text-center text-sm text-muted-foreground">No brands found.</div>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>

            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>

      <section>
        <div className="max-w-[1270px] w-full mx-auto flex justify-center items-center flex-col px-4">
          <div className="w-full h-12 bg-surface rounded-lg shadow-md mb-4 border-b-2 border-border flex justify-center items-center">
            <h2 className="text-2xl font-bold italic text-secondary text-center ">Explore </h2>
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
            <AlertDialogAction onClick={() => router.push("/auth/login")}>Login</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
