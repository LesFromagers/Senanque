/**
 * Wax-seal mark for the No. 1 season in whatever context is currently
 * filtered (all-time, a coach's tenure, a decade, ...). Garnet is scoped to
 * exactly this kind of rank-1 mark per DESIGN.md's sub-project palette
 * extension rules — it never appears anywhere else in this component set.
 */
type WaxSealProps = {
  /** e.g. "ALL-TIME" or "1974-1988" — whatever context this No. 1 applies to. */
  contextLabel: string;
  className?: string;
};

export function WaxSealIcon({ contextLabel, className }: WaxSealProps) {
  return (
    <svg
      viewBox="0 0 72 72"
      width="100%"
      className={className}
      role="img"
      aria-label={`No. 1 ${contextLabel}`}
    >
      <circle cx={36} cy={36} r={33} fill="none" className="stroke-garnet" strokeWidth={1.5} />
      <circle cx={36} cy={36} r={27} fill="none" className="stroke-garnet" strokeWidth={1} strokeDasharray="2 3" />
      <text
        x={36}
        y={29}
        textAnchor="middle"
        className="fill-garnet"
        style={{ font: "600 11px var(--font-mono, ui-monospace, monospace)", letterSpacing: "0.05em" }}
      >
        NO. 1
      </text>
      <text
        x={36}
        y={40}
        textAnchor="middle"
        className="fill-garnet"
        style={{ font: "500 6px var(--font-sans, sans-serif)", letterSpacing: "0.15em" }}
      >
        {contextLabel.toUpperCase()}
      </text>
      <text
        x={36}
        y={50}
        textAnchor="middle"
        className="fill-garnet"
        style={{ font: "500 6px var(--font-sans, sans-serif)", letterSpacing: "0.15em" }}
      >
        · OU ·
      </text>
    </svg>
  );
}
