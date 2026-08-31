/**
 * The Dantès Gambit's project-level hero motif — Château d'If, drawn in
 * the Arcade's own grammar (components/brand/Arcade.tsx): thin outline
 * rules, exactly one Lavender-filled element (the keep's two lit windows,
 * read as one pair), no lettering baked into the illustration itself. This
 * stands in for the Arcade on chess pages — the Arcade must not also
 * appear here (see DESIGN.md's "signature visual element" note and the
 * Heisman Park Ledger's StadiumMark.tsx, the first project-level instance
 * of the same rule).
 *
 * Geometry is the design study's locked "4a — the long approach, east
 * keep" composition: a landing ramp at the west end, the curtain climbing
 * in three crenellated steps eastward, and the summit group at the right —
 * a tall keep flanked by a smaller turret on each side, Lavender on the
 * keep's two windows. It's drawn as a true mirror of an earlier "3b" draft
 * (built at 0–480 climbing east→west, then flipped with `scale(-1, 1)`)
 * rather than redrawn, so the geometry below is that source drawing;
 * the transform is what makes the climb run left to right.
 */
type ChateauDIfMarkProps = {
  className?: string;
};

const CHARCOAL = "stroke-charcoal";
const STONE = "stroke-stone";

// Merlon rows — each centered on its own mass with equal gaps and equal
// edge insets (re-spaced so every row reads evenly, not just placed by eye).
const WALL_STEP_1 = [293, 319, 345, 371]; // lower curtain step, closest to the ramp
const WALL_STEP_2 = [220, 241, 262]; // middle curtain step
const TURRET_L = [66, 81]; // west flanking turret (2, narrowed to fit its span)
const KEEP = [108, 129, 150]; // the tall keep (3, centered)
const TURRET_R = [178, 193]; // east flanking turret (2)

export function ChateauDIfMark({ className }: ChateauDIfMarkProps) {
  return (
    <svg
      viewBox="0 0 480 152"
      width="100%"
      className={className}
      role="img"
      aria-label="Château d'If — the island climbing to a tall keep flanked by two smaller turrets, its two lit windows in Lavender"
    >
      <g transform="translate(480, 0) scale(-1, 1)" fill="none">
        {/* waterline and the sea rule below it */}
        <line x1={10} y1={140} x2={470} y2={140} className={STONE} strokeWidth={1.25} />
        <line x1={76} y1={147} x2={404} y2={147} className={STONE} strokeWidth={1.25} />
        {/* rock line the island sits on */}
        <path d="M0 132 L60 122 L150 114 L260 111 L360 113 L430 120 L480 130" className={STONE} strokeWidth={1.25} />

        {/* landing ramp at the west end (mirrored to the right by the group transform) */}
        <path d="M472 128 L396 102" className={CHARCOAL} strokeWidth={1.5} />
        <path d="M472 135 L396 109" className={CHARCOAL} strokeWidth={1.5} />
        <path d="M448 130 L450 122 M426 122 L428 114 M406 114 L408 106" className={STONE} strokeWidth={1.25} />

        {/* curtain wall, stepping up in three courses to the summit group */}
        <path d="M396 110 V98 H280 V88 H215 V78 H58 V121" className={CHARCOAL} strokeWidth={1.5} />
        {WALL_STEP_1.map((x) => (
          <rect key={`w1-${x}`} x={x} y={91} width={12} height={7} className={CHARCOAL} strokeWidth={1.5} />
        ))}
        {WALL_STEP_2.map((x) => (
          <rect key={`w2-${x}`} x={x} y={81} width={12} height={7} className={CHARCOAL} strokeWidth={1.5} />
        ))}

        {/* west flanking turret */}
        <path d="M62 78 V52 H96 V78" className={CHARCOAL} strokeWidth={1.5} />
        {TURRET_L.map((x) => (
          <rect key={`tl-${x}`} x={x} y={46} width={11} height={6} className={CHARCOAL} strokeWidth={1.5} />
        ))}
        <rect x={74} y={60} width={6} height={9} className={CHARCOAL} strokeWidth={1.25} />

        {/* the keep — tallest mass, Lavender on its two windows */}
        <path d="M104 78 V20 H166 V78" className={CHARCOAL} strokeWidth={1.5} />
        {KEEP.map((x) => (
          <rect key={`k-${x}`} x={x} y={14} width={12} height={6} className={CHARCOAL} strokeWidth={1.5} />
        ))}
        <rect x={116} y={34} width={8} height={12} className="fill-lavender stroke-charcoal" strokeWidth={1.5} />
        <rect x={144} y={34} width={8} height={12} className="fill-lavender stroke-charcoal" strokeWidth={1.5} />

        {/* east flanking turret */}
        <path d="M174 78 V52 H208 V78" className={CHARCOAL} strokeWidth={1.5} />
        {TURRET_R.map((x) => (
          <rect key={`tr-${x}`} x={x} y={46} width={11} height={6} className={CHARCOAL} strokeWidth={1.5} />
        ))}
        <rect x={186} y={60} width={6} height={9} className={CHARCOAL} strokeWidth={1.25} />
      </g>
    </svg>
  );
}
