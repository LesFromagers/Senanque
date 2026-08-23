import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Method & Source — The Heisman Park Ledger",
};

export default function MethodPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/analytics/heisman-park-ledger"
        className="text-xs tracking-label uppercase text-stone hover:text-plum"
      >
        ← The Ledger
      </Link>

      <h1 className="mt-4 font-display text-3xl font-light text-charcoal">Method &amp; source</h1>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-charcoal/90">
        <section>
          <h2 className="font-display text-lg font-light text-charcoal">Sources</h2>
          <p className="mt-2">
            Season records, coaches, conferences, and schedules: Wikipedia&rsquo;s API only,
            throttled and identified by a real User-Agent (see{" "}
            <code className="font-mono text-xs">scripts/heisman_ledger/</code>). Efficiency
            ratings from 2005 forward: the College Football Data API. Twenty-seven marquee
            seasons were verified by hand before any automated pull ran, and always win a
            conflict with an automated pull. Nothing here is ever scraped from
            Sports-Reference or a similar ToS-restricted site — a fact worth cross-checking
            there is flagged for a human to check by hand instead.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-light text-charcoal">Power Index</h2>
          <p className="mt-2">
            <code className="font-mono text-xs">0.50 × Performance + 0.35 × Accomplishment + 0.15 × Talent</code>,
            each layer normalized 0-100. Performance weighs point-differential z-score (50%),
            an opponent-adjusted SRS-style margin (30%), and offensive/defensive efficiency
            z-scores (10% each). Accomplishment is a capped point table for national titles,
            conference titles, final ranking, and bowl outcomes. Talent weighs Heisman winners
            and All-Americans, normalized against OU&rsquo;s highest-ever talent season.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-light text-charcoal">Where this departs from the ideal formula</h2>
          <p className="mt-2">
            Three adjustments, made because the literal formula needs data this project
            doesn&rsquo;t have and won&rsquo;t fabricate to get:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Point differential is z-scored against OU&rsquo;s own season-to-season history,
              not a national per-season average — no source here provides 130 years of
              national point-differential data.
            </li>
            <li>
              The SRS-style strength-of-schedule margin needs every opponent&rsquo;s own
              season game log. That second-order pull hasn&rsquo;t been built yet, so it&rsquo;s
              null for every season today — its 30% weight is redistributed across the other
              Performance sub-components instead of scored as zero, and every affected season
              is flagged.
            </li>
            <li>
              Draft-pick counts in the Talent layer aren&rsquo;t scored at all — no draft-record
              data source is wired into this pipeline. Flagged on every season rather than
              silently treated as zero picks.
            </li>
          </ul>
          <p className="mt-2">
            See <code className="font-mono text-xs">lib/heisman-ledger/power-index.ts</code>{" "}
            for the full reasoning, and any season&rsquo;s detail page for exactly which gaps
            apply to it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-light text-charcoal">Tiebreaker</h2>
          <p className="mt-2">
            Two seasons within 1.0 point of each other on the final scale are ordered by: beat
            Texas that year, then beat Oklahoma State, then point-differential z-score. This
            never changes the underlying score — only the display order for near-ties.
          </p>
        </section>
      </div>
    </div>
  );
}
