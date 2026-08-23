const TIER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Tier 1 · CFBD efficiency",
  2: "Tier 2 · yards/play",
  3: "Tier 3 · record vs. rank proxy",
  4: "Tier 4 · points/game only",
};

const TIER_DESCRIPTIONS: Record<1 | 2 | 3 | 4, string> = {
  1: "2005-present — SP+/efficiency ratings from CollegeFootballData.com.",
  2: "1950s-2000s — offensive/defensive yards per play.",
  3: "Pre-1950s or a gap year — yards/game weighed against that season's national ranking, used as a proxy.",
  4: "The earliest or thinnest seasons — points per game only.",
};

export function DataTierBadge({ tier }: { tier: 1 | 2 | 3 | 4 }) {
  return (
    <span
      title={TIER_DESCRIPTIONS[tier]}
      className="inline-flex items-center rounded-sm border border-stone/60 px-1.5 py-0.5 text-[10px] tracking-label uppercase text-stone"
    >
      {TIER_LABELS[tier]}
    </span>
  );
}
