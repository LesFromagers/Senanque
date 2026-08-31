import { TIERS } from "@/lib/chess/tiers";

/**
 * Copy adapted from the design brief's draft (section 5b), corrected
 * against the engineering addendum's actual Phase 1 scope — the brief's
 * original draft said "no opening book"; Phase 1 ships one (25 lines,
 * move-highlight only), so the gap named here is persistence, not that.
 */
export function AboutBand() {
  return (
    <div className="grid grid-cols-1 gap-8 border-t border-stone/40 pt-[26px] sm:grid-cols-2">
      <div>
        <div className="text-[11px] tracking-label text-stone uppercase">About the build</div>
        <p className="mt-3 text-sm text-charcoal/88">
          Edmond Dantès learned chess in a cell, from a priest who had nothing left to teach but
          patience. That&rsquo;s the whole design of this thing: an opponent who explains himself,
          and four difficulties that are really four stages of a man&rsquo;s education.
        </p>
        <p className="mt-3 text-sm text-charcoal/88">
          Phase 1 is the board, the engine, an opening book of twenty-five lines, and Faria&rsquo;s
          seal. Phase 2 hands his commentary to Claude — the same move, read aloud by someone who
          has seen you make it before. Gaps get named here rather than hidden: nothing is saved
          yet, and the game resets on refresh.
        </p>
      </div>
      <div>
        <div className="text-[11px] tracking-label text-stone uppercase">The four difficulties</div>
        <div className="mt-3 flex flex-col">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-[110px_56px_1fr] items-baseline gap-3.5 border-b border-stone/28 py-2.5 sm:grid-cols-[150px_60px_1fr]"
            >
              <span className="font-display text-[16px] font-light">{t.name}</span>
              <span className="font-mono text-[11px] text-stone">{t.eloLabel}</span>
              <span className="text-[13px] text-charcoal/80">{t.beat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
