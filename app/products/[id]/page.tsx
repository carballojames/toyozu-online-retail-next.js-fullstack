import { prisma } from "@/lib/prisma";

import  {
  type CompatibilityRow,
  type ProductDetail,
} from "./types";

import ProductDetailClient from "./ProductDetailClient";

export const runtime = "nodejs";

function normalizePublicImagePath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.includes("/")) return `/${trimmed}`;
  return `/products/${trimmed}`;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { redirect } = await import("next/navigation");
  redirect(`/product/${encodeURIComponent(id)}`);
}