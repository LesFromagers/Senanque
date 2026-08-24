/**
 * The Heisman Park Ledger's project-level hero motif — the one exception
 * DESIGN.md's "signature visual element" section carves out for a spoke:
 * a south-facade line-art elevation of the stadium, drawn to the same
 * one-fill-thin-stroke grammar as the hub's Arcade (components/brand/
 * Arcade.tsx), standing in for it on this project's own pages.
 *
 * Pavilion/light-tower/scoreboard coordinates were measured directly off
 * the locked design PDF (pixel-analysis of a 600 DPI render). The center
 * bay was redrawn a level past that, against a photo of Gaylord Family
 * Oklahoma Memorial Stadium's actual south entrance: the tower has to
 * come down as one continuous mass from the scoreboard block to the
 * ground-level arched entrance — a consistent width the whole way, not a
 * narrow gable/mullion neck that pinches in and widens back out. The
 * pediment, tracery mullions, and pointed portal all share one width now.
 */
type StadiumMarkProps = {
  className?: string;
};

const CENTER_X = 1459.5;
const GROUND_Y = 1238;

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
  const strokeWidth = 5;
  const strokeWidthFine = 3.5;

  const pavilionInnerEdge = 642;
  const arcadeOuterEdge = 2277;

  // The tower: one consistent half-width from the pediment base all the
  // way to the ground-level portal — no narrowing in the middle.
  const towerHalfWidth = 210;
  const towerL = CENTER_X - towerHalfWidth;
  const towerR = CENTER_X + towerHalfWidth;
  const pedimentApex = { x: CENTER_X, y: 468 }; // touches the scoreboard block's bottom edge
  const pedimentBaseY = 560;
  const cornice1Y = 724;
  const cornice2Y = 780;
  const stringCourseY = 974;
  const portalTransitionY = 1125; // where the portal's vertical legs give way to the pointed top
  const portalApex = { x: CENTER_X, y: 1030 };

  const mullions = [
    { x: towerL + 35, top: 690 },
    { x: towerL + 105, top: 630 },
    { x: CENTER_X, top: 600 },
    { x: towerR - 105, top: 630 },
    { x: towerR - 35, top: 690 },
  ];

  // Second-story windows, fit between the pavilion and the tower.
  const windowY = 830;
  const windowH = 110;
  const windowW = 90;
  const leftWindowXs = evenBoxes(pavilionInnerEdge, towerL, 4, windowW);

  // Ground-arcade round arches, same span as the windows above them.
  const springY = 1120;
  const archCount = 3;
  const archWidth = (towerL - pavilionInnerEdge) / archCount - 20;
  const leftArchXs = evenBoxes(pavilionInnerEdge, towerL, archCount, archWidth);

  return (
    <svg
      viewBox="0 0 2940 1280"
      width="100%"
      className={className}
      role="img"
      aria-label="A line-art elevation of the stadium's south facade — the Heisman Park Ledger's hero mark"
    >
      <g fill="none" strokeLinecap="square">
        {/* ground line */}
        <line x1={30} y1={GROUND_Y} x2={2889} y2={GROUND_Y} className={CHARCOAL} strokeWidth={strokeWidth} />

        {/* light towers: box with 2 dividers, pole to ground, 5-rod symmetric fan on the block */}
        {[
          { boxX: [89, 216] as [number, number], poleX: 152.5 },
          { boxX: [mirror(216), mirror(89)] as [number, number], poleX: mirror(152.5) },
        ].map(({ boxX, poleX }) => (
          <g key={poleX}>
            <rect x={boxX[0]} y={107} width={boxX[1] - boxX[0]} height={108} className={CHARCOAL} strokeWidth={strokeWidthFine} />
            <line x1={boxX[0]} y1={143} x2={boxX[1]} y2={143} className={STONE} strokeWidth={strokeWidthFine} />
            <line x1={boxX[0]} y1={179} x2={boxX[1]} y2={179} className={STONE} strokeWidth={strokeWidthFine} />
            <line x1={poleX} y1={215} x2={poleX} y2={GROUND_Y} className={STONE} strokeWidth={strokeWidthFine} />
          </g>
        ))}

        {/* corner pavilions: flat lintel, lancet recess (pointed top, vertical legs) */}
        {[
          { sides: [280, 642] as [number, number], recessLegs: [372, 549] as [number, number], apexX: 461 },
          { sides: [mirror(642), mirror(280)] as [number, number], recessLegs: [mirror(549), mirror(372)] as [number, number], apexX: mirror(461) },
        ].map(({ sides, recessLegs, apexX }) => (
          <g key={apexX} className={CHARCOAL} strokeWidth={strokeWidth}>
            <line x1={sides[0]} y1={610} x2={sides[1]} y2={610} />
            <line x1={sides[0]} y1={610} x2={sides[0]} y2={GROUND_Y} />
            <line x1={sides[1]} y1={610} x2={sides[1]} y2={GROUND_Y} />
            <path d={`M${recessLegs[0]} ${GROUND_Y} V920 L${apexX} 795 L${recessLegs[1]} 920 V${GROUND_Y}`} />
          </g>
        ))}

        {/* second-story cornice (double line) — runs pavilion to tower, both sides */}
        <line x1={pavilionInnerEdge} y1={cornice1Y} x2={towerL} y2={cornice1Y} className={STONE} strokeWidth={strokeWidthFine} />
        <line x1={pavilionInnerEdge} y1={cornice2Y} x2={towerL} y2={cornice2Y} className={STONE} strokeWidth={strokeWidthFine} />
        <line x1={towerR} y1={cornice1Y} x2={arcadeOuterEdge} y2={cornice1Y} className={STONE} strokeWidth={strokeWidthFine} />
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

        {/* the tower: pediment, continuous side walls, tracery mullions, pointed portal beneath — all one width */}
        <path
          d={`M${towerL} ${pedimentBaseY} L${pedimentApex.x} ${pedimentApex.y} L${towerR} ${pedimentBaseY}`}
          className={CHARCOAL}
          strokeWidth={strokeWidth}
        />
        <line x1={towerL} y1={pedimentBaseY} x2={towerL} y2={portalTransitionY} className={CHARCOAL} strokeWidth={strokeWidth} />
        <line x1={towerR} y1={pedimentBaseY} x2={towerR} y2={portalTransitionY} className={CHARCOAL} strokeWidth={strokeWidth} />
        {mullions.map((m) => (
          <line key={m.x} x1={m.x} y1={m.top} x2={m.x} y2={stringCourseY} className={STONE} strokeWidth={strokeWidthFine} />
        ))}
        {/* portal: lancet shape (vertical legs, then the pitched top) at the tower's own width */}
        <path
          d={`M${towerL} ${GROUND_Y} V${portalTransitionY} L${portalApex.x} ${portalApex.y} L${towerR} ${portalTransitionY} V${GROUND_Y}`}
          className={CHARCOAL}
          strokeWidth={strokeWidth}
        />

        {/* scoreboard block, staggered light-rod fan above it */}
        <rect x={1088} y={230} width={743} height={233} className={CHARCOAL} strokeWidth={strokeWidth} />
        {/* the one Lavender fill */}
        <rect x={1133} y={260} width={653} height={173} className="fill-lavender stroke-charcoal" strokeWidth={strokeWidthFine} />
        {[
          { x: CENTER_X, top: 59 },
          { x: 1349.5, top: 88 },
          { x: mirror(1349.5), top: 88 },
          { x: 1239.5, top: 118 },
          { x: mirror(1239.5), top: 118 },
        ].map((rod) => (
          <line key={rod.x} x1={rod.x} y1={230} x2={rod.x} y2={rod.top} className={STONE} strokeWidth={strokeWidthFine} />
        ))}
      </g>
    </svg>
  );
}
