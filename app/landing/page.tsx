import Landing from "@/pages/user-pages/product/Landing";
import { prisma } from "@/lib/prisma";
import type { ProductCard } from "@/app/products/[name]/types";

function isLocalDatabaseUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
	} catch {
		return false;
	}
}

export default async function LandingRoutePage() {
	const databaseUrl = process.env.DATABASE_URL;
	const dbIsUsable =
		Boolean(databaseUrl) &&
		!(process.env.VERCEL && databaseUrl && isLocalDatabaseUrl(databaseUrl));

	type LandingProduct = {
		product_id: number;
		name: string;
		description: string | null;
		selling_price: unknown;
		quantity: unknown;
		brand: { name: string } | null;
		product_image: {
			id: number;
			image: string | null;
			image_mime: string | null;
			image_updated_at: Date | null;
		}[];
	};

	let products: LandingProduct[] = [];
	let categories: Array<{ category_id: number; name: string }> = [];
	let carMakes: Array<{ car_id: number; make: string }> = [];
	let carModels: Array<{ model_id: number; car_id: number; model_name: string }> = [];
	let years: Array<{ year_id: number; year: number }> = [];

	try {
		if (!dbIsUsable) {
			console.warn(
				"DATABASE_URL is missing or points to localhost on Vercel; rendering landing page without DB lookups.",
			);
		} else {
			[products, categories, carMakes, carModels, years] = await Promise.all([
				prisma.product.findMany({
					select: {
						product_id: true,
						name: true,
						description: true,
						selling_price: true,
						quantity: true,
						brand: { select: { name: true } },
						product_image: {
							select: {
								id: true,
								image: true,
								image_mime: true,
								image_updated_at: true,
							},
							orderBy: { id: "asc" },
							take: 1,
						},
					},
					orderBy: { product_id: "desc" },
					take: 100,
				}),
				prisma.category.findMany({ select: { category_id: true, name: true }, orderBy: { name: "asc" } }),
				prisma.cars.findMany({ select: { car_id: true, make: true }, orderBy: { make: "asc" } }),
				prisma.car_models.findMany({
					select: { model_id: true, car_id: true, model_name: true },
					orderBy: { model_name: "asc" },
				}),
				prisma.product_years.findMany({ select: { year_id: true, year: true }, orderBy: { year: "desc" } }),
			]);
		}
	} catch (error) {
		console.error("Landing page queries failed:", error);
		products = [];
		categories = [];
		carMakes = [];
		carModels = [];
		years = [];
	}

	const initialProducts: ProductCard[] = products.map((product) => {
		const first = product.product_image?.[0];
		const version = first?.image_updated_at ? first.image_updated_at.getTime() : 0;
		const hasBytes = Boolean(first?.image_mime);
		const raw = first?.image?.trim() ?? "";
		const publicUrl = raw
			? raw.startsWith("/")
				? raw
				: raw.includes("/")
					? `/${raw}`
					: `/products/${raw}`
			: "";

		const imageUrl = first
			? hasBytes
				? `/api/products/${product.product_id}/images/${first.id}?v=${version}`
				: publicUrl
			: "";

		return {
			product_id: product.product_id,
			name: product.name,
			description: product.description ?? undefined,
			selling_price: Number(product.selling_price ?? 0),
			quantity: Number(product.quantity ?? 0),
			brand_name: product.brand?.name ?? undefined,
			images: imageUrl ? [{ image: imageUrl }] : undefined,
		};
	});

	const mappedCategories = categories.map((category) => ({ id: category.category_id, name: category.name }));
	const mappedMakes = carMakes.map((make) => ({ car_id: make.car_id, make: make.make }));
	const mappedModels = carModels.map((model) => ({
		model_id: model.model_id,
		car_id: model.car_id,
		model_name: model.model_name,
	}));
	const mappedYears = years.map((year) => ({ year_id: year.year_id, year: year.year }));

	return (
		<Landing
			initialProducts={initialProducts}
			categories={mappedCategories}
			carMakes={mappedMakes}
			carModels={mappedModels}
			years={mappedYears}
		/>
	);
}
