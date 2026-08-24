/**
 * The Heisman Park Ledger's project-level hero motif — the one exception
 * DESIGN.md's "signature visual element" section carves out for a spoke:
 * a south-facade line-art elevation of the stadium, drawn to the same
 * one-fill-thin-stroke grammar as the hub's Arcade (components/brand/
 * Arcade.tsx), standing in for it on this project's own pages.
 *
 * Coordinates below were measured directly off the locked design PDF (a
 * pixel-analysis pass on a 600 DPI render — scanning rows/columns for
 * non-background runs — rather than eyeballed), so proportions match the
 * reference exactly: light towers with a 5-rod symmetric fan, twin
 * pavilions with a lancet recess (pointed top, vertical legs — not a
 * plain triangle), an eight-window second story, a seven-bay ground
 * arcade with a pointed portal under the tracery bay, seven evenly
 * spaced tracery verticals with staggered tops, and the scoreboard block
 * above. One Lavender fill, no lettering baked into the mark itself.
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

export function StadiumMark({ className }: StadiumMarkProps) {
  const strokeWidth = 5;
  const strokeWidthFine = 3.5;

  // Second-story windows: measured (x1, x2) pairs, left side only — right
  // side is the mirror. y is shared.
  const windowY = 830;
  const windowH = 110;
  const leftWindows: [number, number][] = [
    [691, 788],
    [838, 935],
    [985, 1082],
    [1132, 1229],
  ];

  // Ground-arcade round arches: (legLeft, legRight) center-to-center,
  // left side only — mirrored for the right. The portal (center bay) is
  // handled separately since it's pointed, not round.
  const springY = 1120;
  const arches: [number, number][] = [
    [673.5, 835.5],
    [879.5, 1040.5],
    [1084.5, 1246.5],
  ];
  const portalLegs: [number, number] = [1356.5, 1562.5];

  // Tracery: 2 jambs (part of the gable) + 5 inner mullions, evenly
  // spaced 44 apart, staggered tops per the reference.
  const gableApex = { x: CENTER_X, y: 468 };
  const gableBaseY = 635;
  const jambX: [number, number] = [1327.5, 1591.5];
  const mullions: { x: number; top: number }[] = [
    { x: 1371.5, top: 690 },
    { x: 1415.5, top: 630 },
    { x: CENTER_X, top: 600 },
    { x: 1503.5, top: 630 },
    { x: 1547.5, top: 690 },
  ];
  const stringCourseY = 974;

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
            <path
              d={`M${recessLegs[0]} ${GROUND_Y} V920 L${apexX} 795 L${recessLegs[1]} 920 V${GROUND_Y}`}
            />
          </g>
        ))}

        {/* second-story cornice (double line), spanning between the pavilions */}
        <line x1={642} y1={724} x2={2277} y2={724} className={STONE} strokeWidth={strokeWidthFine} />
        <line x1={642} y1={780} x2={2277} y2={780} className={STONE} strokeWidth={strokeWidthFine} />

        {/* second-story windows */}
        {[...leftWindows, ...leftWindows.map(([a, b]): [number, number] => [mirror(b), mirror(a)])].map(([x1, x2]) => (
          <rect key={x1} x={x1} y={windowY} width={x2 - x1} height={windowH} className={STONE} strokeWidth={strokeWidthFine} />
        ))}

        {/* string course above the ground arcade */}
        <line x1={642} y1={stringCourseY} x2={2277} y2={stringCourseY} className={STONE} strokeWidth={strokeWidthFine} />

        {/* seven-bay ground arcade: round arches + the pointed portal under the tracery */}
        {[...arches, ...arches.map(([a, b]): [number, number] => [mirror(b), mirror(a)])].map(([legL, legR]) => {
          const radius = (legR - legL) / 2;
          return (
            <path
              key={legL}
              d={`M${legL} ${GROUND_Y} V${springY} A${radius} ${radius} 0 0 1 ${legR} ${springY} V${GROUND_Y}`}
              className={CHARCOAL}
              strokeWidth={strokeWidth}
            />
          );
        })}
        <path
          d={`M${portalLegs[0]} ${GROUND_Y} L${CENTER_X} 1030 L${portalLegs[1]} ${GROUND_Y}`}
          className={CHARCOAL}
          strokeWidth={strokeWidth}
        />

        {/* tracery bay: gable (jambs are part of it) + staggered inner mullions */}
        <path
          d={`M${jambX[0]} ${stringCourseY} V${gableBaseY} L${gableApex.x} ${gableApex.y} L${jambX[1]} ${gableBaseY} V${stringCourseY}`}
          className={CHARCOAL}
          strokeWidth={strokeWidth}
        />
        {mullions.map((m) => (
          <line key={m.x} x1={m.x} y1={m.top} x2={m.x} y2={stringCourseY} className={STONE} strokeWidth={strokeWidthFine} />
        ))}

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
