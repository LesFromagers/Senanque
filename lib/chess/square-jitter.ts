import { BOARD_TONES, LIMESTONE_GRAIN, WALNUT_GRAIN, CHESS_CHROME } from "./board-tones";

/**
 * The board's "5a — hewn" stonework: every square is a single dressed
 * block with its own tint, its own hairline fracture, and a joint/chisel
 * of its own weight — deterministically seeded off the square's index so
 * it never reshuffles between renders (the design brief is explicit:
 * jitter must derive from the square index, never render-time
 * randomness). Ported from the design study's own square-jitter recipe.
 */

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

/** a8 -> 0, h8 -> 7, a1 -> 56, h1 -> 63 — stable regardless of board orientation. */
export function squareIndex(square: string): number {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = Number(square[1]);
  const row = 8 - rank; // rank 8 is row 0
  return row * 8 + file;
}

export function isLightSquare(square: string): boolean {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = Number(square[1]);
  const row = 8 - rank;
  return (row + file) % 2 === 0;
}

/** xorshift-free hash noise matching the design study's own generator —
 * a sine-based PRNG seeded by (index, salt), so each square draws several
 * independent-looking values without needing a stateful RNG. */
function jit(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const px = (n: number) => `${n.toFixed(2)}px`;

export type SquareChrome = {
  selected?: boolean;
  legalMove?: boolean;
  lastMove?: boolean;
  /** A hint's suggested square. Not in Marseille's scoped-use list (that's
   * legal dots, the selected ring, and the last-move wash only) — Gold is
   * the existing "CTA / highlight" token, reused rather than inventing a
   * new color for a mechanic the visual design study never depicted. */
  hint?: boolean;
  /** The opening-study book's next move for the player. Sage — the
   * existing "tags" token — rather than a third invented color; distinct
   * from Gold's hint ring so the two assists never look like the same
   * mechanic. */
  book?: boolean;
};

export type SquareStyle = {
  background: string;
  boxShadow: string;
};

/**
 * Full square style: grain + deterministic tint + hairline fracture, base
 * color from `light`/`dark` (Château tones or a live theme override), plus
 * Marseille interaction chrome layered on top per `chrome`.
 */
export function hewnSquareStyle(
  square: string,
  chrome: SquareChrome = {},
  light: string = BOARD_TONES.limestone,
  dark: string = BOARD_TONES.walnut,
): SquareStyle {
  const i = squareIndex(square);
  const light_ = isLightSquare(square);
  const grain = light_ ? LIMESTONE_GRAIN : WALNUT_GRAIN;
  const base = `${grain}, ${light_ ? light : dark}`;

  const tint = jit(i, 1) * 0.07 - 0.035;
  const tintLayer =
    tint > 0
      ? `linear-gradient(rgba(255,255,255,${tint.toFixed(3)}), rgba(255,255,255,${tint.toFixed(3)}))`
      : `linear-gradient(rgba(59,47,38,${(-tint).toFixed(3)}), rgba(59,47,38,${(-tint).toFixed(3)}))`;

  const angle = Math.round(18 + jit(i, 2) * 144);
  const stop = 34 + jit(i, 3) * 36;
  const fracture =
    `linear-gradient(${angle}deg, transparent ${stop.toFixed(1)}%, ` +
    `rgba(59,47,38,0.11) ${(stop + 0.7).toFixed(1)}%, transparent ${(stop + 1.6).toFixed(1)}%)`;

  const layers = [tintLayer, fracture, base];
  if (chrome.lastMove) layers.unshift(CHESS_CHROME.lastMoveWash);
  if (chrome.legalMove) {
    // 14px dot, centered — drawn as a radial gradient layer so it composes
    // with the stone underneath rather than needing a separate element.
    layers.unshift(
      `radial-gradient(circle 7px at 50% 50%, ${CHESS_CHROME.legalDot} 99%, transparent 100%)`,
    );
  }

  const joint =
    `inset 0 0 0 ${px(0.5 + jit(i, 4) * 1.1)} ${BOARD_TONES.jointRule}` +
    (chrome.selected ? `, ${CHESS_CHROME.selectedRing}` : "") +
    (chrome.hint && !chrome.selected ? ", inset 0 0 0 2px var(--color-gold)" : "") +
    (chrome.book && !chrome.selected && !chrome.hint ? ", inset 0 0 0 2px var(--color-sage)" : "") +
    `, inset 0 ${px(-1 - jit(i, 5))} 0 rgba(59,47,38,0.10)` +
    `, inset 0 ${px(1 + jit(i, 6))} 0 rgba(255,255,255,0.16)`;

  return { background: layers.join(", "), boxShadow: joint };
}
