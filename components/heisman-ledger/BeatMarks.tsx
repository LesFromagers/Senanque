import type { TriBool } from "@/lib/heisman-ledger/types";

/**
 * TEX/OSU tiebreaker marks. Garnet-outlined when true (one of Garnet's
 * scoped uses per DESIGN.md), muted Stone when false or not on the
 * schedule that year — never the same visual weight, so a true "beat
 * Texas" reads at a glance in a dense table.
 */
function Mark({ label, value }: { label: string; value: TriBool }) {
  const isTrue = value === "TRUE";
  const isSplit = value === "SPLIT" || (typeof value === "string" && value.startsWith("SPLIT"));
  const notScheduled = value === null || value === "N/A (not on schedule)";

  const className = isTrue
    ? "border-garnet text-garnet"
    : isSplit
      ? "border-gold text-gold"
      : notScheduled
        ? "border-stone/30 text-stone/50"
        : "border-stone/60 text-stone";

  return (
    <span
      title={value ?? "No data"}
      className={`inline-flex items-center justify-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

export function BeatMarks({ beatTexas, beatOsu }: { beatTexas: TriBool; beatOsu: TriBool }) {
  return (
    <span className="inline-flex gap-1">
      <Mark label="TEX" value={beatTexas} />
      <Mark label="OSU" value={beatOsu} />
    </span>
  );
}
