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
          <p className="mt-2">
            From 2005 forward, CFBD also supplies OU&rsquo;s own raw total/rushing/passing yards
            and turnovers, shown on each season&rsquo;s detail page as context alongside the
            efficiency numbers. There&rsquo;s deliberately no matching &ldquo;yards allowed&rdquo;
            figure — CFBD&rsquo;s season-stats endpoint doesn&rsquo;t split by offense/defense, and
            a real one would mean reconciling every opponent&rsquo;s own season stats
            game-by-game, which this pipeline doesn&rsquo;t do. Defense PPA (above) is the actual,
            opponent-adjusted defensive-quality number the Power Index uses; the raw yardage
            fields are supplementary, not a scoring input.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-light text-charcoal">Power Index</h2>
          <p className="mt-2">
            <code className="font-mono text-xs">0.50 × Performance + 0.35 × Accomplishment + 0.15 × Talent</code>,
            each layer normalized 0-100. Performance weighs point-differential z-score (5/7,
            &asymp;71%) and offensive/defensive efficiency z-scores (1/7, &asymp;14% each).
            Accomplishment is a capped point table for national titles, conference titles,
            final ranking, and bowl outcomes. Talent weighs Heisman winners and All-Americans,
            normalized against OU&rsquo;s highest-ever talent season.
          </p>
          <p className="mt-2">
            The point-differential z-score is centered on the real NCAA national average
            scoring margin for that season (1937&ndash;present, from the NCAA&rsquo;s own
            published team-statistics trends) &mdash; not OU&rsquo;s own history. Scale still
            comes from OU&rsquo;s own season-to-season spread, by design, not as a placeholder:
            see &ldquo;Where this departs from the ideal formula&rdquo; below.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-light text-charcoal">Where this departs from the ideal formula</h2>
          <p className="mt-2">
            Two adjustments, made because the literal formula needs data this project
            doesn&rsquo;t have and won&rsquo;t fabricate to get:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Point differential is centered on the real NCAA national average for that
              season, but scaled by OU&rsquo;s own historical spread rather than a national
              one. The NCAA&rsquo;s own published stats give a national average, never a
              cross-team standard deviation for a historical season &mdash; getting a real one
              would mean pulling every FBS team&rsquo;s own season figures across ~90 years,
              a pull this project doesn&rsquo;t attempt. This is the formula&rsquo;s defined
              method, not a fallback awaiting better data, so it isn&rsquo;t flagged
              per-season.
            </li>
            <li>
              Draft-pick counts in the Talent layer aren&rsquo;t scored at all — no draft-record
              data source is wired into this pipeline. Flagged on every season rather than
              silently treated as zero picks.
            </li>
          </ul>
          <p className="mt-2">
            An earlier draft of this formula also weighed an opponent-adjusted,
            SRS-style strength-of-schedule margin (30% of the Performance layer). It&rsquo;s
            been dropped outright, not left half-built: computing it for real needs every OU
            opponent&rsquo;s own full season game log across 130 years, a pull this project has
            no near-term plan to build. Every season had already been scored with that
            component redistributed away, so removing it changed no scores.
          </p>
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
