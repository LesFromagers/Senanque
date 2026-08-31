"use client";

import { FariaSeal } from "./FariaSeal";
import { TIERS, type TierId } from "@/lib/chess/tiers";

type FariaStripProps = {
  tierId: TierId;
  remark: string;
  gameInProgress: boolean;
  onTierChange: (id: TierId) => void;
};

/**
 * Faria speaks in a full-width strip above the board — portrait, name,
 * tier dropdown, one remark, Marseille rule on top. Never a transcript,
 * never a per-message avatar: one remark at a time, replaced in place.
 */
export function FariaStrip({ tierId, remark, gameInProgress, onTierChange }: FariaStripProps) {
  const handleChange = (next: TierId) => {
    if (next === tierId) return;
    if (gameInProgress) {
      const confirmed = window.confirm(
        "Changing difficulty starts a new game — the current position will be lost. Continue?",
      );
      if (!confirmed) return;
    }
    onTierChange(next);
  };

  return (
    <div className="flex items-start gap-3 border-t-2 border-marseille border-b border-stone/40 py-[18px] sm:gap-5">
      <FariaSeal size={44} className="flex-none sm:hidden" />
      <FariaSeal size={56} className="hidden flex-none sm:block" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
          <span className="font-display text-[17px] font-light sm:text-[19px]">
            Abbé Faria
          </span>
          <label className="flex items-center gap-2 rounded-sm border border-stone/70 px-3 py-1.5 text-[13px] whitespace-nowrap">
            <span className="sr-only">Difficulty</span>
            <select
              value={tierId}
              onChange={(e) => handleChange(e.target.value as TierId)}
              className="cursor-pointer bg-transparent outline-none"
            >
              {TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.eloLabel}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-1.5 font-display text-[16px] font-light text-pretty sm:text-[19px]">
          {remark}
        </p>
      </div>
    </div>
  );
}
