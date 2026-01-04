export type ProductImage = {
  id?: number;
  image: string;
  url?: string;
};

export type ProductDetail = {
  product_id: number;
  name: string;
  brand_name?: string;
  category_name?: string;
  description?: string;
  selling_price: number;
  quantity: number;
  images?: ProductImage[];
};

export type CompatibilityRow = {
  id: number;
  make: string;
  model_name: string;
  start_year: number | null;
  end_year: number | null;
};

export interface ProductCard {
  product_id: number | string;
  name: string;
  description?: string;
  brand_name?: string;
  category_name?: string;
  images?: ProductImage[];
  discount?: number;
  quantity?: number;
  rating?: number;
  reviews?: number;
  selling_price: number;
}
