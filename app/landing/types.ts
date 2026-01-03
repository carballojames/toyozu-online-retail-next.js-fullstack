import type { StaticImageData } from "next/image";
import type { ProductCard } from "@/app/products/[id]/types";

export interface Category {
  id: number;
  name: string;
}

export interface Brand {
  name: string;
  logo: StaticImageData;
}

export interface CarMake {
  car_id: number | string;
  make: string;
}

export interface CarModel {
  model_id: number | string;
  car_id: number | string;
  model_name: string;
}

export interface YearItem {
  year_id: number | string;
  year: number | string;
}

export type LandingClientProps = {
  initialProducts?: ProductCard[];
  categories: Category[];
  carMakes: CarMake[];
  carModels: CarModel[];
  years: YearItem[];
};
