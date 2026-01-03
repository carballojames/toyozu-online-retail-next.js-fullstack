import { prisma } from "@/lib/prisma";
import LandingClient from "../../user-pages/landing";
import type { ProductCard } from "@/app/products/[id]/types";

type LandingPageProps = {
  initialProducts?: ProductCard[];
};

export default async function LandingPage({ initialProducts }: LandingPageProps) {
  const [categories, carMakes, carModels, years] = await Promise.all([
    prisma.category.findMany({ select: { category_id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.cars.findMany({ select: { car_id: true, make: true }, orderBy: { make: "asc" } }),
    prisma.car_models.findMany({ select: { model_id: true, car_id: true, model_name: true }, orderBy: { model_name: "asc" } }),
    prisma.product_years.findMany({ select: { year_id: true, year: true }, orderBy: { year: "desc" } }),
  ]);

  const mappedCategories = categories.map((c) => ({ id: c.category_id, name: c.name }));
  const mappedMakes = carMakes.map((c) => ({ car_id: c.car_id, make: c.make }));
  const mappedModels = carModels.map((m) => ({ model_id: m.model_id, car_id: m.car_id, model_name: m.model_name }));
  const mappedYears = years.map((y) => ({ year_id: y.year_id, year: y.year }));

  return (
    // LandingClient is a client component that keeps interactive behavior
    <LandingClient
      initialProducts={initialProducts}
      categories={mappedCategories}
      carMakes={mappedMakes}
      carModels={mappedModels}
      years={mappedYears}
    />
  );
}