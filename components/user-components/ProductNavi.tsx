"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ProductNavi() {
  const router = useRouter();
  const pathname = usePathname();

  const categories = [
    "Brake Pads",
    "Oil Filters",
    "Spark Plugs",
    "Tires",
    "Batteries",
    "Air Filters",
    "Belts & Hoses",
    "Suspension",
    "Exhaust",
    "Engine Parts",
  ];

  const brands = [
    "Bosch",
    "NGK",
    "Denso",
    "ACDelco",
    "Mobil 1",
    "Castrol",
    "Michelin",
    "Goodyear",
    "Monroe",
    "KYB",
  ];

  const [filters, setFilters] = useState({
    priceRange: [0, 1000],
    rating: 0,
    categories: [] as string[],
    brands: [] as string[],
  });

  useEffect(() => {
    // push current filters to the URL as search params so the server page can read them
    const params = new URLSearchParams();
    if (filters.priceRange[0] !== 0) params.set("minPrice", String(filters.priceRange[0]));
    if (filters.priceRange[1] !== 1000) params.set("maxPrice", String(filters.priceRange[1]));
    if (filters.rating) params.set("rating", String(filters.rating));
    if (filters.categories.length) params.set("category", filters.categories.join(","));
    if (filters.brands.length) params.set("brand", filters.brands.join(","));

    // keep page at 1 when changing filters
    params.set("page", "1");

    router.replace(`${pathname}?${params.toString()}`);
  }, [filters, pathname, router]);

  const toggleCategory = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const toggleBrand = (brand: string) => {
    setFilters((prev) => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter((b) => b !== brand)
        : [...prev.brands, brand],
    }));
  };

  return (
    <aside className="w-[230px] flex-shrink-0">
      <div className="sticky top-24 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Price Range</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>${filters.priceRange[0]}</span>
              <span>${filters.priceRange[1]}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="10"
              value={filters.priceRange[1]}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  priceRange: [0, Number.parseInt(e.target.value)],
                }))
              }
              className="w-full accent-red-600"
            />
            <div className="space-y-2">
              <button
                onClick={() => setFilters((prev) => ({ ...prev, priceRange: [0, 50] }))}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded"
              >
                Under $50
              </button>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, priceRange: [50, 100] }))}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded"
              >
                $50 - $100
              </button>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, priceRange: [100, 200] }))}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded"
              >
                $100 - $200
              </button>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, priceRange: [200, 1000] }))}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded"
              >
                Over $200
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Rating</h3>
          <div className="space-y-2">
            {[4.5, 4.0, 3.5, 3.0].map((rating) => (
              <button
                key={rating}
                onClick={() => setFilters((prev) => ({ ...prev, rating }))}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
                  filters.rating === rating
                    ? "bg-red-50 text-red-600"
                    : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                }`}
              >
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(rating) ? "text-yellow-400" : "text-gray-300"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span>& Up</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {categories.map((category) => (
              <label
                key={category}
                className="flex items-center gap-2 cursor-pointer hover:bg-red-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">{category}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">Brands</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {brands.map((brand) => (
              <label
                key={brand}
                className="flex items-center gap-2 cursor-pointer hover:bg-red-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">{brand}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={() =>
            setFilters({ priceRange: [0, 1000], rating: 0, categories: [], brands: [] })
          }
          className="w-full px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 font-medium"
        >
          Clear All Filters
        </button>
      </div>
    </aside>
  );
}
