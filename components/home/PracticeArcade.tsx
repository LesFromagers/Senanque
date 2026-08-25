import Link from "next/link";
import { BelfryMark } from "./BelfryMark";

/**
 * The homepage hero mark: the belfry standing on a wide, square-piered
 * center bay ("Theology"), flanked by two round-headed arcade bays each
 * side — the home mark (see BelfryIcon) drawn at scale with two extra
 * arches. This is a homepage-only composition, distinct from the shared
 * `Arcade` motif in components/brand (still used unchanged as the plain
 * section marker on spoke pages) — see DESIGN.md's "signature visual
 * element" note on that split.
 *
 * Desktop (sm: and up, real pointer): bays rest Oat with a hidden label
 * and light up Lavender with the label on hover, 200ms. Mobile: no
 * hover to rely on, so Theology stands filled by default and every
 * label stays visible in Stone.
 */
const PRACTICES = [
  { label: "Economics", short: "Econ" },
  { label: "Sports", short: "Sports" },
  { label: "Theology", short: "Theology" },
  { label: "Art", short: "Art" },
  { label: "Games", short: "Games" },
] as const;

const bayBase =
  "flex-none box-border flex items-end justify-center overflow-hidden whitespace-nowrap uppercase cursor-pointer transition-colors duration-200 pb-3 border-plum border-b-0";

export function PracticeArcade() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-[166px] w-full max-w-[344px] sm:h-[318px] sm:max-w-[661px]">
        <BelfryMark
          width={92}
          height={111}
          strokeWidth={0.62}
          className="absolute bottom-[55px] left-1/2 -translate-x-1/2 sm:hidden"
        />
        <BelfryMark
          width={165}
          height={198}
          strokeWidth={0.62}
          className="absolute bottom-[120px] left-1/2 hidden -translate-x-1/2 sm:block"
        />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-[5px] sm:gap-2">
          {PRACTICES.map((practice) =>
            practice.label === "Theology" ? (
              <Link
                key={practice.label}
                href="#work"
                aria-label={`View ${practice.label} work`}
                className={`${bayBase} relative w-[92px] h-[55px] border-2 rounded-none bg-lavender text-charcoal text-[8px] tracking-[0.08em] sm:w-[165px] sm:h-[120px] sm:border-4 sm:bg-oat sm:text-transparent sm:hover:bg-lavender sm:hover:text-charcoal sm:text-[12px] sm:tracking-[0.12em]`}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-[13px] w-[2px] bg-plum sm:left-[26px] sm:w-1"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 right-[13px] w-[2px] bg-plum sm:right-[26px] sm:w-1"
                />
                <span className="relative z-10">{practice.label}</span>
              </Link>
            ) : (
              <Link
                key={practice.label}
                href="#work"
                aria-label={`View ${practice.label} work`}
                className={`${bayBase} w-[58px] h-[61px] border-2 rounded-t-full bg-oat text-stone text-[8px] tracking-[0.08em] sm:w-[116px] sm:h-[120px] sm:border-4 sm:text-transparent sm:hover:bg-lavender sm:hover:text-charcoal sm:text-[12px] sm:tracking-[0.12em]`}
              >
                <span className="sm:hidden">{practice.short}</span>
                <span className="hidden sm:inline">{practice.label}</span>
              </Link>
            ),
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-plum sm:h-[6px]" />
      </div>

      <div className="flex w-full max-w-[344px] justify-between text-[10px] tracking-[0.12em] uppercase text-stone sm:max-w-[661px] sm:text-xs sm:tracking-label">
        <span>
          <span className="sm:hidden">Tap a bay</span>
          <span className="hidden sm:inline">Hover a bay</span>
        </span>
        <span>Five practices, one cloister</span>
      </div>
    </div>
  );
}
