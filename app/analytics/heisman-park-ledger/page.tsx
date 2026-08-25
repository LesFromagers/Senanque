import type { Metadata } from "next";
import Link from "next/link";
import { StadiumMark } from "@/components/heisman-ledger/StadiumMark";
import { RankTable, type LedgerRow } from "@/components/heisman-ledger/RankTable";
import { getSeasons } from "@/lib/heisman-ledger/data";
import { computePowerIndex } from "@/lib/heisman-ledger/power-index";

export const metadata: Metadata = {
  title: "The Heisman Park Ledger — Senanque",
  description:
    "A Power Index for every Oklahoma Sooners football season since 1895, normalized across eras of wildly different play styles, schedules, and talent.",
};

// The dataset is a committed static file today (see lib/heisman-ledger/data.ts);
// revalidate has no real effect until that swaps to a live Supabase query,
// but it's set now so the cutover doesn't also require touching this page.
export const revalidate = 3600;

export default async function HeismanParkLedgerPage() {
  const seasons = await getSeasons();
  const results = computePowerIndex(seasons);
  const seasonByYear = new Map(seasons.map((s) => [s.year, s]));
  const rows: LedgerRow[] = results
    .map((result) => {
      const season = seasonByYear.get(result.year);
      return season ? { result, season } : null;
    })
    .filter((r): r is LedgerRow => r !== null);

  const firstYear = Math.min(...seasons.map((s) => s.year));
  const lastYear = Math.max(...seasons.map((s) => s.year));

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <nav className="mb-10 -mt-4 flex items-center gap-2 text-xs tracking-label uppercase text-stone">
        <Link href="/#work" className="hover:text-plum">
          Analytics
        </Link>
        <span>/</span>
        <span className="text-charcoal">The Ledger</span>
      </nav>

      <StadiumMark className="mx-auto mb-10 max-w-xl" />

      <p className="text-center text-xs tracking-label uppercase text-stone">
        Analytics · collegefootballdata.com + Wikipedia
      </p>
      <h1 className="mt-2 text-center font-display text-5xl font-light text-garnet">
        The Heisman Park Ledger
      </h1>
      <p className="mt-3 text-center font-display text-lg italic text-charcoal/80">
        Coronation at the Palace on the Prairie
      </p>
      <p className="mx-auto mt-4 max-w-2xl text-center text-charcoal/90">
        A Power Index for every Oklahoma season since {firstYear}, normalized across eras of
        wildly different play styles, schedules, and talent. One row per year, kept on the
        books — gaps and all, never smoothed over.
      </p>

      <div className="mt-6 flex justify-center gap-3 text-xs">
        <span className="rounded-sm border border-stone/50 px-2 py-1 text-stone">
          {firstYear} — {lastYear} · {seasons.length} of {lastYear - firstYear + 1} seasons loaded
        </span>
      </div>

      <div className="mt-12">
        <RankTable rows={rows} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-stone/30 pt-4 text-sm">
        <Link href="/analytics/heisman-park-ledger/gaps" className="text-plum hover:underline">
          Manual-review worklist →
        </Link>
        <Link href="/analytics/heisman-park-ledger/method" className="text-plum hover:underline">
          Method &amp; source →
        </Link>
      </div>
    </div>
  );
}
