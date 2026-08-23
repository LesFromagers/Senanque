/**
 * "The Bay" — Senanque's one deliberate signature visual element for the
 * shared hub chrome: a row of round-topped Romanesque arches, drawn in thin
 * outline rules, with exactly one bay filled solid lavender. No crest, no
 * cloister photography — this is the only decorative motif in the hub itself
 * (homepage hero, section markers), and it appears once per page there.
 *
 * A spoke may earn exactly one project-level hero motif of its own, drawn in
 * this same one-fill-thin-stroke grammar, standing in for the Arcade on that
 * spoke's own pages — see DESIGN.md's "signature visual element" note. The
 * Heisman Park Ledger's stadium mark is the first instance. That's an
 * extension of this rule, not a second sitewide motif competing with it.
 */
type ArcadeProps = {
  bays?: number;
  filledIndex?: number;
  size?: "hero" | "marker";
  caption?: { title: string; year: string };
  className?: string;
};

export function Arcade({
  bays = 5,
  filledIndex,
  size = "hero",
  caption,
  className,
}: ArcadeProps) {
  const filled = filledIndex ?? Math.floor(bays / 2);
  const bayWidth = 80;
  const bayHeight = size === "hero" ? 120 : 64;
  const archRadius = bayWidth / 2;
  const width = bays * bayWidth;
  const strokeWidth = size === "hero" ? 1.5 : 1.25;

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${width} ${bayHeight + 4}`}
        width="100%"
        role="img"
        aria-label="A row of Romanesque arches, one filled — the Abbey of Sénanque's arcade"
      >
        <line
          x1={0}
          y1={bayHeight}
          x2={width}
          y2={bayHeight}
          className="stroke-charcoal"
          strokeWidth={strokeWidth}
        />
        {Array.from({ length: bays }).map((_, i) => {
          const x = i * bayWidth;
          const isFilled = i === filled;
          const d = `M ${x + 2} ${bayHeight} V ${archRadius + 2} A ${archRadius - 2} ${archRadius - 2} 0 0 1 ${x + bayWidth - 2} ${archRadius + 2} V ${bayHeight}`;
          return (
            <path
              key={i}
              d={d}
              className={isFilled ? "fill-lavender stroke-charcoal" : "fill-none stroke-stone"}
              strokeWidth={strokeWidth}
            />
          );
        })}
      </svg>
      {caption && (
        <figcaption className="mt-3 flex items-baseline justify-between text-xs tracking-label uppercase text-stone">
          <span>{caption.title}</span>
          <span>{caption.year}</span>
        </figcaption>
      )}
    </figure>
  );
}
