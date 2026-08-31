import type { Metadata } from "next";
import { ChateauDIfMark } from "@/components/chess/ChateauDIfMark";
import { DantesGambitGame } from "@/components/chess/DantesGambitGame";
import { AboutBand } from "@/components/chess/AboutBand";

export const metadata: Metadata = {
  title: "The Dantès Gambit — Senanque Intelligence",
  description: "A chess coach with a Count of Monte Cristo twist.",
};

/**
 * `/agentics/chess` — a dedicated static route rather than falling through
 * `app/agentics/[slug]/page.tsx`, per the handoff's "repo changes required
 * first": that dynamic route only generates params for non-live projects,
 * so a live game page needs its own route. The registry entry
 * (lib/projects.ts) stays `status: "planned"` until launch is confirmed —
 * this route works whether or not the homepage links to it yet.
 */
export default function DantesGambitPage() {
  return (
    <div className="mx-auto max-w-[860px] px-6 py-10 sm:py-12">
      <header className="flex flex-col gap-6 border-b border-stone/35 pb-[22px] sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <div>
          <span className="text-[11px] tracking-label text-sage uppercase">Games · Agentics</span>
          <h1 className="mt-2 font-display text-[26px] font-light text-marseille sm:text-[34px]">
            The Dantès Gambit
          </h1>
          <p className="mt-2.5 max-w-[46ch] font-display text-[13px] font-light text-pretty text-charcoal/78 sm:text-[15px]">
            &ldquo;All human wisdom is contained in these two words, —{" "}
            <span className="italic">attendre et espérer</span>.&rdquo;
          </p>
        </div>
        <ChateauDIfMark className="w-full flex-none sm:w-[330px]" />
      </header>

      <DantesGambitGame />
      <AboutBand />
    </div>
  );
}
