import type { Metadata } from "next";
import { Arcade } from "@/components/brand/Arcade";
import { IndicatorCard } from "@/components/charts/IndicatorCard";
import { PottersvilleCallout } from "@/components/charts/PottersvilleCallout";
import { seriesColor } from "@/lib/chart-colors";
import { getBaileyBrosData } from "@/lib/indicators/bailey-bros";

export const metadata: Metadata = {
  title: "Bailey Bros. Economic Barometer — Senanque",
  description:
    "Fed funds, CPI, unemployment, the S&P 500, sentiment, the yield spread, and the Oklahoma coincident index — read against real thresholds, bank lens and VC lens side by side.",
};

// FRED updates at most daily; refresh roughly hourly rather than on every
// request. With lib/fred.ts's graceful no-key fallback, this also lets the
// page prerender cleanly with zero FRED_API_KEY set (as in this sandbox),
// picking up live data automatically once a real key exists in Vercel.
export const revalidate = 3600;

export default async function BaileyBrosPage() {
  const { indicators, compound } = await getBaileyBrosData();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Arcade bays={3} size="marker" className="mb-10 max-w-xs" />

      <p className="text-xs tracking-label uppercase text-stone">Analytics · FRED API</p>
      <h1 className="mt-2 font-display text-4xl font-light text-charcoal">
        Bailey Bros. Economic Barometer
      </h1>
      <p className="mt-4 max-w-2xl text-charcoal/90">
        Seven indicators, 2008 to present, each read against a real threshold rather than a
        gut feeling — a bank lens and a VC lens side by side, since the same reading means
        something different depending on who&rsquo;s holding it.
      </p>

      <div className="mt-10">
        <PottersvilleCallout compound={compound} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {indicators.map((indicator, i) => (
          <IndicatorCard key={indicator.id} indicator={indicator} color={seriesColor(i)} />
        ))}
      </div>
    </div>
  );
}
