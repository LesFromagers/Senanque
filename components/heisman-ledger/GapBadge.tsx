/**
 * The dashboard's incompleteness signal — per the brief, a season with
 * missing underlying fields must never look identical to a fully clean
 * one. Renders nothing when `gaps` is empty; otherwise a Gold-outlined
 * marker (Gold is the site's existing warning/hover-state color, not a
 * new one) with the full gap list in its title tooltip and, optionally,
 * spelled out inline for the season-detail view.
 */
export function GapBadge({ gaps, expanded = false }: { gaps: string[]; expanded?: boolean }) {
  if (gaps.length === 0) return null;

  if (expanded) {
    return (
      <div className="rounded-sm border border-gold/60 bg-gold/10 p-4">
        <p className="text-xs tracking-label uppercase text-gold">
          {gaps.length} gap{gaps.length === 1 ? "" : "s"} in this season&rsquo;s data
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-charcoal/90">
          {gaps.map((gap, i) => (
            <li key={i}>{gap}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <span
      title={gaps.join("\n")}
      className="inline-flex items-center gap-1 rounded-sm border border-gold/60 px-1.5 py-0.5 text-[10px] tracking-label uppercase text-gold"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3 w-3">
        <path d="M12 4 21 20H3Z" strokeLinejoin="round" />
        <line x1="12" y1="10" x2="12" y2="14" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      </svg>
      {gaps.length} gap{gaps.length === 1 ? "" : "s"}
    </span>
  );
}
