/**
 * The Heisman Park Ledger's project-level hero motif — the one exception
 * DESIGN.md's "signature visual element" section carves out for a spoke:
 * a south-facade line-art elevation of the stadium, drawn to the same
 * one-fill-thin-stroke grammar as the hub's Arcade (components/brand/
 * Arcade.tsx), standing in for it on this project's own pages. Two light
 * towers, twin corner pavilions, a seven-arch ground arcade, and a center
 * scoreboard bay — the one Lavender fill, per the locked icon spec: 1.25px
 * stroke, square caps, no marks or lettering baked into the mark itself.
 */
type StadiumMarkProps = {
  className?: string;
};

export function StadiumMark({ className }: StadiumMarkProps) {
  const strokeWidth = 1.25;
  return (
    <svg
      viewBox="0 0 320 130"
      width="100%"
      className={className}
      role="img"
      aria-label="A line-art elevation of the stadium's south facade — the Heisman Park Ledger's hero mark"
    >
      <g fill="none" className="stroke-charcoal" strokeWidth={strokeWidth} strokeLinecap="square">
        {/* ground line */}
        <line x1={4} y1={116} x2={316} y2={116} />

        {/* light towers */}
        <line x1={22} y1={116} x2={22} y2={30} />
        <rect x={15} y={20} width={14} height={10} className="stroke-stone" />
        <line x1={298} y1={116} x2={298} y2={30} />
        <rect x={291} y={20} width={14} height={10} className="stroke-stone" />

        {/* corner pavilions, pointed recesses */}
        <path d="M56 116 V78 L72 58 L88 78 V116" />
        <path d="M232 116 V78 L248 58 L264 78 V116" />

        {/* seven-arch ground arcade */}
        {Array.from({ length: 7 }).map((_, i) => {
          const x = 96 + i * 18;
          return (
            <path
              key={i}
              d={`M${x} 116 V100 A9 9 0 0 1 ${x + 18} 100 V116`}
              className="stroke-stone"
            />
          );
        })}

        {/* center bay with tracery mullions */}
        <path d="M138 116 V44 L162 20 L186 44 V116" />
        {[148, 155, 162, 169, 176].map((x) => (
          <line key={x} x1={x} y1={70} x2={x} y2={116} className="stroke-stone" />
        ))}

        {/* scoreboard — the one Lavender fill */}
        <rect x={140} y={26} width={44} height={16} className="fill-lavender stroke-charcoal" />
      </g>
    </svg>
  );
}
