import { prisma } from "@/lib/prisma";
import LandingClient from "../../user-pages/landing";
import type { ProductCard } from "@/app/products/[name]/types";

type LandingPageProps = {
  initialProducts?: ProductCard[];
};

function isLocalDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export default async function LandingPage({ initialProducts }: LandingPageProps) {
  const databaseUrl = process.env.DATABASE_URL;
  const dbIsUsable =
    Boolean(databaseUrl) &&
    !(process.env.VERCEL && databaseUrl && isLocalDatabaseUrl(databaseUrl));

  if (!dbIsUsable) {
    console.warn(
      "DATABASE_URL is missing or points to localhost on Vercel; rendering landing page without DB lookups.",
    );
    return (
      <LandingClient
        initialProducts={initialProducts}
        categories={[]}
        carMakes={[]}
        carModels={[]}
        years={[]}
      />
    );
  }

  let categories: Array<{ category_id: number; name: string }> = [];
  let carMakes: Array<{ car_id: number; make: string }> = [];
  let carModels: Array<{ model_id: number; car_id: number; model_name: string }> = [];
  let years: Array<{ year_id: number; year: number }> = [];

  try {
    [categories, carMakes, carModels, years] = await Promise.all([
      prisma.category.findMany({ select: { category_id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.cars.findMany({ select: { car_id: true, make: true }, orderBy: { make: "asc" } }),
      prisma.car_models.findMany({
        select: { model_id: true, car_id: true, model_name: true },
        orderBy: { model_name: "asc" },
      }),
      prisma.product_years.findMany({ select: { year_id: true, year: true }, orderBy: { year: "desc" } }),
    ]);
  } catch (e) {
    // Avoid taking down the whole page if the database isn't reachable yet.
    console.error("Landing lookup queries failed:", e);
  }

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