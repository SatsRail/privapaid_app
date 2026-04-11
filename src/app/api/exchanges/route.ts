import { NextRequest, NextResponse } from "next/server";
import config from "@/config/instance";
import type { SatsRailExchange } from "@/lib/satsrail";

let cachedExchanges: SatsRailExchange[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchExchanges(): Promise<SatsRailExchange[]> {
  const now = Date.now();
  if (cachedExchanges && now - cacheTimestamp < CACHE_TTL) {
    return cachedExchanges;
  }

  const res = await fetch(`${config.satsrail.apiUrl}/pub/exchanges`);
  if (!res.ok) return [];

  const data = await res.json();
  cachedExchanges = data.exchanges ?? [];
  cacheTimestamp = now;
  return cachedExchanges!;
}

export async function GET(request: NextRequest) {
  const countryCode =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null;

  const allExchanges = await fetchExchanges();

  const showAll = request.nextUrl.searchParams.get("all") === "1";

  let exchanges: SatsRailExchange[];
  if (showAll || !countryCode) {
    exchanges = allExchanges;
  } else {
    exchanges = allExchanges.filter((ex) =>
      ex.countries.some((c) => c.iso_code === countryCode)
    );
  }

  return NextResponse.json({
    exchanges,
    country_code: countryCode,
  });
}
