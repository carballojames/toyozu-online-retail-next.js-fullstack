import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().min(3).max(200),
});

const providerResponseSchema = z.array(
  z.object({
    place_id: z.union([z.number(), z.string()]),
    display_name: z.string(),
    lat: z.string(),
    lon: z.string(),
  })
);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" });

    if (!parsedQuery.success) {
      return NextResponse.json({ error: "q is required" }, { status: 400 });
    }

    const apiKey = process.env.MAPSCO_GEOCODE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is missing MAPSCO_GEOCODE_API_KEY" },
        { status: 500 }
      );
    }

    const upstreamUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(parsedQuery.data.q)}&api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding provider error" }, { status: 502 });
    }

    const json = (await res.json()) as unknown;
    const parsed = providerResponseSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Unexpected provider response" }, { status: 502 });
    }

    const data = parsed.data
      .map((r) => {
        const lat = Number(r.lat);
        const lng = Number(r.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        return {
          id: String(r.place_id),
          label: r.display_name,
          lat,
          lng,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .slice(0, 10);

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to geocode" }, { status: 500 });
  }
}
