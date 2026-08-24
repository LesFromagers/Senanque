/**
 * The Heisman Park Ledger's project-level hero motif — the one exception
 * DESIGN.md's "signature visual element" section carves out for a spoke:
 * a south-facade line-art elevation of the stadium, drawn to the same
 * one-fill-thin-stroke grammar as the hub's Arcade (components/brand/
 * Arcade.tsx), standing in for it on this project's own pages.
 *
 * Every coordinate here comes from pixel-analysis of the locked reference
 * drawing (row/column scans for non-background runs, separating charcoal
 * from stone by color distance) rather than eyeballing a preview — that's
 * what caught the real structure of the center bay, which three earlier
 * by-eye passes all got wrong: it isn't a single narrow gable pinching
 * down from the scoreboard to the entrance. It's a WIDE box — the same
 * width as the scoreboard above it — that runs from the scoreboard's own
 * base down to the second-story cornice line. A narrower tracery gable is
 * inset within that box (its apex touching the scoreboard's underside),
 * and its legs keep going *past* the box's own bottom edge, straight
 * through the window band, down to the string course. Below that, a
 * separate, similarly narrow pointed portal is the ground-level entrance.
 * Three distinct widths, not one: wide box, narrower gable/mullions,
 * narrower still portal — nested, not unified.
 */
type StadiumMarkProps = {
  className?: string;
};

const CENTER_X = 520;
const GROUND_Y = 372;

// Charcoal (primary structure) vs Stone (secondary/decorative) — matches
// the reference's own line-weight hierarchy, not just a single flat stroke.
const CHARCOAL = "stroke-charcoal";
const STONE = "stroke-stone";

function mirror(x: number) {
  return 2 * CENTER_X - x;
}

/** Evenly spaces `count` boxes of `boxWidth` across [start, end], with equal gaps front/back/between. */
function evenBoxes(start: number, end: number, count: number, boxWidth: number): number[] {
  const gap = (end - start - count * boxWidth) / (count + 1);
  return Array.from({ length: count }, (_, i) => start + gap * (i + 1) + boxWidth * i);
}

export function StadiumMark({ className }: StadiumMarkProps) {
  const strokeWidth = 2;
  const strokeWidthFine = 1.3;

  const pavilionInnerEdge = 271;
  const arcadeOuterEdge = mirror(271);

  // The wide box: scoreboard width, continued straight down to the cornice.
  const towerL = 407.5;
  const towerR = 632.5;
  const boxTopY = 63;
  const scoreboardDividerY = 135; // splits the lavender display from the plain wall below
  const cornice1Y = 217; // the box's own bottom edge — and the full-facade cornice line

  // The narrower tracery gable, inset in the box — apex touches the divider,
  // legs run straight past the box's bottom edge into the window band.
  const gableApex = { x: CENTER_X, y: 134 };
  const gableLegX = { l: 480, r: 560 };
  const gableTransitionY = 180;
  const stringCourseY = 294;

  const mullions = [
    { x: 494, top: 220 },
    { x: 507, top: 205 },
    { x: CENTER_X, top: 195 },
    { x: 533, top: 205 },
    { x: 546, top: 220 },
  ];

  // The ground-level portal — its own, still-narrower lancet.
  const portalApex = { x: CENTER_X, y: 308 };
  const portalLegX = { l: 489, r: 551 };
  const portalTransitionY = 338;

  // Second-story windows, fit between the pavilion and the wide box.
  const cornice2Y = 233;
  const windowY = 245;
  const windowH = 39;
  const windowW = 29;
  const leftWindowXs = evenBoxes(pavilionInnerEdge, towerL, 3, windowW);

  // Ground-arcade round arches, same span as the windows above them.
  const springY = 322;
  const archCount = 3;
  const archWidth = 30;
  const leftArchXs = evenBoxes(pavilionInnerEdge, towerL, archCount, archWidth);

  return (
    <svg
      viewBox="0 0 1050 400"
      width="100%"
      className={className}
      role="img"
      aria-label="A line-art elevation of the stadium's south facade — the Heisman Park Ledger's hero mark"
    >
      <g fill="none" strokeLinecap="square">
        {/* ground line */}
        <line x1={12} y1={GROUND_Y} x2={1038} y2={GROUND_Y} className={CHARCOAL} strokeWidth={strokeWidth} />

        {/* light towers: box with 2 dividers, pole to ground, 5-rod symmetric fan on the block */}
        {[
          { boxX: [103, 142] as [number, number], poleX: 122.5 },
          { boxX: [mirror(142), mirror(103)] as [number, number], poleX: mirror(122.5) },
        ].map(({ boxX, poleX }) => (
          <g key={poleX}>
            <rect x={boxX[0]} y={27} width={boxX[1] - boxX[0]} height={32} className={CHARCOAL} strokeWidth={strokeWidthFine} />
            <line x1={boxX[0]} y1={39} x2={boxX[1]} y2={39} className={STONE} strokeWidth={strokeWidthFine} />
            <line x1={boxX[0]} y1={50} x2={boxX[1]} y2={50} className={STONE} strokeWidth={strokeWidthFine} />
            <line x1={poleX} y1={59} x2={poleX} y2={GROUND_Y} className={STONE} strokeWidth={strokeWidthFine} />
          </g>
        ))}

        {/* corner pavilions: flat lintel, lancet recess (pointed top, vertical legs) */}
        {[
          { sides: [161, 271] as [number, number], recessLegs: [189.5, 243] as [number, number], apexX: 216 },
          { sides: [mirror(271), mirror(161)] as [number, number], recessLegs: [mirror(243), mirror(189.5)] as [number, number], apexX: mirror(216) },
        ].map(({ sides, recessLegs, apexX }) => (
          <g key={apexX} className={CHARCOAL} strokeWidth={strokeWidth}>
            <line x1={sides[0]} y1={178} x2={sides[1]} y2={178} />
            <line x1={sides[0]} y1={178} x2={sides[0]} y2={GROUND_Y} />
            <line x1={sides[1]} y1={178} x2={sides[1]} y2={GROUND_Y} />
            <path d={`M${recessLegs[0]} ${GROUND_Y} V275 L${apexX} 235 L${recessLegs[1]} 275 V${GROUND_Y}`} />
          </g>
        ))}

        {/* second-story cornice (thick line, then a thinner one at the window band's own top) */}
        <line x1={pavilionInnerEdge} y1={cornice1Y} x2={towerL} y2={cornice1Y} className={CHARCOAL} strokeWidth={strokeWidth} />
        <line x1={towerR} y1={cornice1Y} x2={arcadeOuterEdge} y2={cornice1Y} className={CHARCOAL} strokeWidth={strokeWidth} />
        <line x1={pavilionInnerEdge} y1={cornice2Y} x2={towerL} y2={cornice2Y} className={STONE} strokeWidth={strokeWidthFine} />
        <line x1={towerR} y1={cornice2Y} x2={arcadeOuterEdge} y2={cornice2Y} className={STONE} strokeWidth={strokeWidthFine} />

        {/* second-story windows */}
        {[...leftWindowXs, ...leftWindowXs.map((x) => mirror(x + windowW) - windowW)].map((x) => (
          <rect key={x} x={x} y={windowY} width={windowW} height={windowH} className={STONE} strokeWidth={strokeWidthFine} />
        ))}

        {/* string course above the ground arcade — runs pavilion to tower, both sides */}
        <line x1={pavilionInnerEdge} y1={stringCourseY} x2={towerL} y2={stringCourseY} className={STONE} strokeWidth={strokeWidthFine} />
        <line x1={towerR} y1={stringCourseY} x2={arcadeOuterEdge} y2={stringCourseY} className={STONE} strokeWidth={strokeWidthFine} />

        {/* ground arcade round arches, flanking the tower */}
        {[...leftArchXs, ...leftArchXs.map((x) => mirror(x + archWidth) - archWidth)].map((legL) => {
          const legR = legL + archWidth;
          const radius = archWidth / 2;
          return (
            <path
              key={legL}
              d={`M${legL} ${GROUND_Y} V${springY} A${radius} ${radius} 0 0 1 ${legR} ${springY} V${GROUND_Y}`}
              className={CHARCOAL}
              strokeWidth={strokeWidth}
            />
          );
        })}

        {/* the wide box: scoreboard width, continued down to the cornice */}
        <rect x={towerL} y={boxTopY} width={towerR - towerL} height={cornice1Y - boxTopY} className={CHARCOAL} strokeWidth={strokeWidth} />
        <line x1={towerL} y1={scoreboardDividerY} x2={towerR} y2={scoreboardDividerY} className={CHARCOAL} strokeWidth={strokeWidth} />

        {/* the one Lavender fill, inset in the scoreboard's own upper half */}
        <rect x={420.5} y={80} width={199} height={47} className="fill-lavender stroke-charcoal" strokeWidth={strokeWidthFine} />

        {/* the tracery gable: narrower than the box, apex on the divider, legs running past the box's own bottom edge into the window band */}
        <path
          d={`M${gableLegX.l} ${gableTransitionY} L${gableApex.x} ${gableApex.y} L${gableLegX.r} ${gableTransitionY}`}
          className={CHARCOAL}
          strokeWidth={strokeWidth}
        />
        <line x1={gableLegX.l} y1={gableTransitionY} x2={gableLegX.l} y2={stringCourseY} className={CHARCOAL} strokeWidth={strokeWidth} />
        <line x1={gableLegX.r} y1={gableTransitionY} x2={gableLegX.r} y2={stringCourseY} className={CHARCOAL} strokeWidth={strokeWidth} />
        {mullions.map((m) => (
          <line key={m.x} x1={m.x} y1={m.top} x2={m.x} y2={stringCourseY} className={STONE} strokeWidth={strokeWidthFine} />
        ))}

        {/* the ground-level portal: its own, still-narrower lancet */}
        <path
          d={`M${portalLegX.l} ${GROUND_Y} V${portalTransitionY} L${portalApex.x} ${portalApex.y} L${portalLegX.r} ${portalTransitionY} V${GROUND_Y}`}
          className={CHARCOAL}
          strokeWidth={strokeWidth}
        />

        {/* staggered light-rod fan above the scoreboard block */}
        {[
          { x: CENTER_X, top: 13 },
          { x: 486.5, top: 22 },
          { x: mirror(486.5), top: 22 },
          { x: 453, top: 31 },
          { x: mirror(453), top: 31 },
        ].map((rod) => (
          <line key={rod.x} x1={rod.x} y1={boxTopY} x2={rod.x} y2={rod.top} className={STONE} strokeWidth={strokeWidthFine} />
        ))}
      </g>
    </svg>
  );
}
