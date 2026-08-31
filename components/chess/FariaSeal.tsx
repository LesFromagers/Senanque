/**
 * Abbé Faria's avatar — a wax-seal stand-in, not a portrait.
 *
 * The design session tried three geometric portrait drafts (hood up, hood
 * down, a face in the roundel) and rejected all three: at avatar size they
 * collapsed toward a cartoon, which is the one thing this character can't
 * be. This seal is the shipped Phase 1 avatar, not a placeholder pending
 * layout — only a commissioned line-art engraving should replace it, and
 * only in this one component, which is why it stays a single swappable
 * unit rather than being inlined at each call site.
 *
 * Note on the hero-motif rule: DESIGN.md's grammar for a project-level
 * decorative mark (see ChateauDIfMark.tsx) forbids lettering. This seal
 * carries "AF" — that's fine, because it isn't the hero motif. It's a UI
 * avatar (a functional identity mark, like a person's initials), and the
 * design brief calls this out explicitly as the one place that exception
 * applies; the exception ends the day a real portrait ships.
 */
type FariaSealProps = {
  /** 56 at desktop, 44 on phone — see the Faria strip's own breakpoint. */
  size?: number;
  className?: string;
};

export function FariaSeal({ size = 56, className }: FariaSealProps) {
  // The reference study thickens both rules at the 44px phone size (1.6px
  // vs 1.25px) so the seal doesn't thin out to nothing at a glance.
  const strokeWidth = size <= 44 ? 1.6 : 1.25;

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Abbé Faria"
    >
      <circle cx={24} cy={24} r={22} fill="none" className="stroke-charcoal" strokeWidth={strokeWidth} />
      <circle
        cx={24}
        cy={24}
        r={17}
        fill="none"
        className="stroke-stone"
        strokeWidth={strokeWidth}
        strokeDasharray="2 3"
      />
      <text
        x={24}
        y={30}
        textAnchor="middle"
        className="fill-charcoal"
        style={{ font: "300 16px var(--font-display, Literata, Georgia, serif)" }}
      >
        AF
      </text>
    </svg>
  );
}
