"use client";

/**
 * "Read the scoring methodology" — a collapsed-by-default visual
 * breakdown of the Power Index formula, sitting just above the table.
 * Deliberately a diagram, not prose: the same formula is already spelled
 * out in sentences on the /method page, for the reader who wants that.
 * This is for the reader who wants it in one glance.
 *
 * The top bar is a true proportional split (Performance/Accomplishment/
 * Talent sum to the 100% that IS the Power Index) and uses the site's
 * locked chart-series order (lavender, plum, sage — the front three of
 * SERIES_COLOR_ORDER, drawn in that fixed sequence per lib/chart-colors.ts
 * — never reordered). The three columns below it are each a different
 * shape on purpose, not forced into one chart type: Performance's three
 * sub-components really are weighted shares of that layer (71/14/14%), so
 * they get their own proportional mini-bar; Accomplishment and Talent are
 * independently-earnable, capped point tables, not weighted shares of a
 * total, so a proportional bar there would misrepresent them — they get a
 * short list of point values instead.
 */
import { useState } from "react";
import Link from "next/link";

const LAYERS = [
  { key: "performance", label: "Performance", weight: 50, color: "var(--color-lavender)", textClass: "text-charcoal" },
  { key: "accomplishment", label: "Accomplishment", weight: 35, color: "var(--color-plum)", textClass: "text-oat" },
  { key: "talent", label: "Talent", weight: 15, color: "var(--color-sage)", textClass: "text-charcoal" },
] as const;

const PERFORMANCE_PARTS = [
  { label: "Point Diff. Z-Score", share: 71 },
  { label: "Offense Efficiency", share: 14 },
  { label: "Defense Efficiency", share: 15 },
];

const ACCOMPLISHMENT_PARTS = [
  { label: "National Title", points: "25–40" },
  { label: "Conference Title", points: "20" },
  { label: "Final AP Rank", points: "5–15" },
  { label: "Bowl Result (by stage)", points: "2–40" },
];

const TALENT_PARTS = [
  { label: "Heisman Winner", points: "30" },
  { label: "Heisman Finalist", points: "10 ea · cap 20" },
  { label: "Consensus All-American", points: "8 ea · cap 40" },
  { label: "Draft Pick, Rd 1–2 / 3–7", points: "6 / 2" },
];

export function MethodologyDisclosure() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 text-xs tracking-label uppercase text-plum hover:text-garnet"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="square"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
        Read the scoring methodology
      </button>

      {open && (
        <div className="mt-4 rounded-sm border border-stone/40 bg-oat p-5">
          <p className="text-xs tracking-label uppercase text-stone">Power Index</p>

          {/* Top-level split: a true 50/35/15 proportional bar. */}
          <div className="mt-3 flex h-14 w-full overflow-hidden rounded-sm border border-stone/40">
            {LAYERS.map((layer) => (
              <div
                key={layer.key}
                style={{ flexBasis: `${layer.weight}%`, backgroundColor: layer.color }}
                className={`flex flex-col items-center justify-center ${layer.textClass}`}
              >
                <span className="font-display text-sm font-light leading-none">{layer.label}</span>
                <span className="mt-1 font-mono text-xs leading-none">{layer.weight}%</span>
              </div>
            ))}
          </div>

          {/* Per-layer breakdown. */}
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--color-lavender)" }} />
                <span className="text-xs tracking-label uppercase text-charcoal">Performance</span>
              </div>
              {/* A real weighted share of the layer -- gets a mini-bar,
                  each segment a step darker so the three read as distinct
                  even though they're all the same hue. */}
              <div className="mt-2 flex h-6 w-full overflow-hidden rounded-sm border border-stone/30">
                {PERFORMANCE_PARTS.map((p, i) => (
                  <div
                    key={p.label}
                    style={{
                      flexBasis: `${p.share}%`,
                      backgroundColor: "var(--color-lavender)",
                      opacity: 1 - i * 0.3,
                    }}
                  />
                ))}
              </div>
              <ul className="mt-2 space-y-1 text-xs text-charcoal/80">
                {PERFORMANCE_PARTS.map((p) => (
                  <li key={p.label} className="flex justify-between gap-2">
                    <span>{p.label}</span>
                    <span className="font-mono text-stone">{p.share}%</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--color-plum)" }} />
                <span className="text-xs tracking-label uppercase text-charcoal">Accomplishment</span>
              </div>
              {/* Independently-earnable capped points, not shares of a
                  total -- a proportional bar here would claim a precision
                  ("this is exactly X% of the layer") the point table
                  doesn't have, so this is a value list instead. */}
              <ul className="mt-2 space-y-1.5 text-xs text-charcoal/80">
                {ACCOMPLISHMENT_PARTS.map((p) => (
                  <li key={p.label} className="flex items-center justify-between gap-2">
                    <span>{p.label}</span>
                    <span
                      className="rounded-sm px-1.5 py-0.5 font-mono text-[10px] text-oat"
                      style={{ backgroundColor: "var(--color-plum)" }}
                    >
                      +{p.points}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-stone">Capped at 100 total.</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--color-sage)" }} />
                <span className="text-xs tracking-label uppercase text-charcoal">Talent</span>
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-charcoal/80">
                {TALENT_PARTS.map((p) => (
                  <li key={p.label} className="flex items-center justify-between gap-2">
                    <span>{p.label}</span>
                    <span
                      className="rounded-sm px-1.5 py-0.5 font-mono text-[10px] text-charcoal"
                      style={{ backgroundColor: "var(--color-sage)" }}
                    >
                      +{p.points}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-stone">Normalized against OU&rsquo;s single highest-ever Talent season.</p>
            </div>
          </div>

          <p className="mt-5 border-t border-stone/30 pt-3 text-xs text-stone">
            Full sourcing and the formula&rsquo;s documented departures from the ideal version:{" "}
            <Link href="/analytics/heisman-park-ledger/method" className="text-plum hover:underline">
              Method &amp; source →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
