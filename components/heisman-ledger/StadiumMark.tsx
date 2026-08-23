/**
 * The Heisman Park Ledger's project-level hero motif — the one exception
 * DESIGN.md's "signature visual element" section carves out for a spoke:
 * a south-facade line-art elevation of the stadium, drawn to the same
 * one-fill-thin-stroke grammar as the hub's Arcade (components/brand/
 * Arcade.tsx), standing in for it on this project's own pages. Redrawn
 * directly against the locked design PDF's "F — south facade, full
 * elevation" sheet: twin light towers, twin pavilions with a pointed
 * recess reaching the ground, an eight-window second story, a seven-arch
 * ground arcade with a pointed portal in the center bay, tracery mullions
 * running the bay's height, and the scoreboard block with staggered light
 * rods above it. One Lavender fill (the scoreboard glass), per the locked
 * icon spec: 1.25px stroke, square caps, no marks or lettering baked into
 * the mark itself.
 */
type StadiumMarkProps = {
  className?: string;
};

const CENTER_X = 495;
const GROUND_Y = 424;

function evenSpacedBoxes(startX: number, endX: number, count: number, boxWidth: number) {
  const span = endX - startX;
  const gap = (span - count * boxWidth) / (count + 1);
  return Array.from({ length: count }).map((_, i) => startX + gap * (i + 1) + boxWidth * i);
}

export function StadiumMark({ className }: StadiumMarkProps) {
  const strokeWidth = 1.25;

  const windowBoxLeft = evenSpacedBoxes(208, 455, 4, 30);
  const windowBoxRight = evenSpacedBoxes(535, 782, 4, 30);
  const windowY = 250;
  const windowH = 36;
  const windowW = 30;

  const arches = Array.from({ length: 7 }).map((_, i) => {
    const archWidth = (782 - 208) / 7;
    const x = 208 + i * archWidth;
    return { x, width: archWidth, isPortal: i === 3 };
  });

  const mullionXs = [455, 475, 495, 515, 535];
  const lightRodXs = evenSpacedBoxes(375, 625, 7, 0);
  const lightRodTops = [18, 32, 10, 2, 12, 28, 20];

  return (
    <svg
      viewBox="0 0 990 430"
      width="100%"
      className={className}
      role="img"
      aria-label="A line-art elevation of the stadium's south facade — the Heisman Park Ledger's hero mark"
    >
      <g fill="none" className="stroke-charcoal" strokeWidth={strokeWidth} strokeLinecap="square">
        {/* ground line */}
        <line x1={2} y1={GROUND_Y} x2={988} y2={GROUND_Y} />

        {/* light towers */}
        <line x1={42} y1={66} x2={42} y2={GROUND_Y} />
        <rect x={21} y={36} width={42} height={30} className="stroke-stone" />
        {[45, 52, 59].map((y) => (
          <line key={y} x1={25} y1={y} x2={59} y2={y} className="stroke-stone" />
        ))}

        <line x1={948} y1={66} x2={948} y2={GROUND_Y} />
        <rect x={927} y={36} width={42} height={30} className="stroke-stone" />
        {[45, 52, 59].map((y) => (
          <line key={y} x1={931} y1={y} x2={965} y2={y} className="stroke-stone" />
        ))}

        {/* corner pavilions — flat header, pointed recess reaching the ground */}
        <path d="M82 203 H208 M82 203 V424 M208 203 V424" />
        <path d="M115 424 L145 275 L175 424" />

        <path d="M782 203 H908 M782 203 V424 M908 203 V424" />
        <path d="M815 424 L845 275 L875 424" />

        {/* second-story cornice (double line) */}
        <line x1={208} y1={228} x2={782} y2={228} className="stroke-stone" />
        <line x1={208} y1={234} x2={782} y2={234} className="stroke-stone" />

        {/* second-story windows */}
        {[...windowBoxLeft, ...windowBoxRight].map((x) => (
          <rect key={x} x={x} y={windowY} width={windowW} height={windowH} className="stroke-stone" />
        ))}

        {/* string course above the ground-floor arcade (double line) */}
        <line x1={208} y1={340} x2={782} y2={340} className="stroke-stone" />
        <line x1={208} y1={346} x2={782} y2={346} className="stroke-stone" />

        {/* seven-arch ground arcade — the center bay gets a pointed portal, not a round arch */}
        {arches.map((arch) =>
          arch.isPortal ? (
            <path
              key={arch.x}
              d={`M${arch.x} 424 L${arch.x + arch.width / 2} 346 L${arch.x + arch.width} 424`}
            />
          ) : (
            <path
              key={arch.x}
              d={`M${arch.x + 4} 424 V${424 - (arch.width - 8) / 2} A${(arch.width - 8) / 2} ${(arch.width - 8) / 2} 0 0 1 ${arch.x + arch.width - 4} ${424 - (arch.width - 8) / 2} V424`}
              className="stroke-stone"
            />
          ),
        )}

        {/* pilaster ticks between arch bays, sitting on the string course */}
        {Array.from({ length: 8 }).map((_, i) => {
          const archWidth = (782 - 208) / 7;
          const x = 208 + i * archWidth;
          return <line key={x} x1={x} y1={340} x2={x} y2={326} className="stroke-stone" />;
        })}

        {/* center bay — tracery mullions running the bay's height, gable above */}
        <path d={`M${CENTER_X - 40} 230 L${CENTER_X} 150 L${CENTER_X + 40} 230`} />
        {mullionXs.map((x) => (
          <line key={x} x1={x} y1={230} x2={x} y2={340} className="stroke-stone" />
        ))}

        {/* scoreboard block */}
        <rect x={375} y={70} width={250} height={80} />
        {/* the one Lavender fill */}
        <rect x={387} y={80} width={226} height={60} className="fill-lavender stroke-charcoal" />
        {lightRodXs.map((x, i) => (
          <line key={x} x1={x} y1={70} x2={x} y2={lightRodTops[i]} className="stroke-stone" />
        ))}
      </g>
    </svg>
  );
}
