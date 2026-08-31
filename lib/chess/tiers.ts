/**
 * The four difficulty tiers — narrative arc doubles as the skill curve.
 * Hint/undo allowance decreases as the tier climbs, mirroring Faria's
 * decreasing intervention as the student needs him less.
 *
 * Engine strength uses `UCI_LimitStrength` + `UCI_Elo` (not just raw Skill
 * Level) per the engineering brief — more human-like play at low ratings,
 * since Skill Level alone still lets the engine spot a sharp tactic a true
 * beginner would miss. `searchMs`/`maxDepth` scale down with the tier for
 * mobile performance — a beginner opponent should also be the cheapest to
 * compute — and every tier (including the uncapped one) carries a hard
 * `searchMs` ceiling so the engine can never hang or drain a phone's
 * battery on a long think.
 *
 * Elba's ~600 target is flagged in the brief as needing playtest
 * verification — Stockfish at low Elo can still land an occasional sharp
 * tactic a true ~600 player would miss, since it's calculating throughout
 * and only deliberately playing worse most of the time. If it bites harder
 * than a true beginner should experience, lower `elo` here (500, even
 * 400) rather than trusting the number in isolation.
 */
export type TierId = "elba" | "chateau-dif" | "monte-cristo" | "hotel-de-morcerf";

export type Tier = {
  id: TierId;
  name: string;
  eloLabel: string;
  elo: number | null;
  hints: number;
  undos: number;
  beat: string;
  /** Hard cap on Stockfish's think time, ms — never exceeded even when uncapped. */
  searchMs: number;
  maxDepth: number;
};

export const TIERS: Tier[] = [
  {
    id: "elba",
    name: "Elba",
    eloLabel: "~600",
    elo: 600,
    hints: 5,
    undos: 3,
    beat: "Naive, trusting — before the fall",
    searchMs: 250,
    maxDepth: 5,
  },
  {
    id: "chateau-dif",
    name: "Château d'If",
    eloLabel: "~1000",
    elo: 1000,
    hints: 3,
    undos: 2,
    beat: "Imprisoned, learning under Faria",
    searchMs: 500,
    maxDepth: 8,
  },
  {
    id: "monte-cristo",
    name: "Monte Cristo",
    eloLabel: "~1400",
    elo: 1400,
    hints: 1,
    undos: 1,
    beat: "Escape achieved, transformation begins",
    searchMs: 1200,
    maxDepth: 12,
  },
  {
    id: "hotel-de-morcerf",
    name: "Hôtel de Morcerf",
    eloLabel: "Uncapped",
    elo: null,
    hints: 0,
    undos: 0,
    beat: "The reckoning — full mastery",
    // "Uncapped" means no Elo limiter, not an unbounded think — still
    // capped so the engine never hangs on a phone.
    searchMs: 4000,
    maxDepth: 18,
  },
];

export const DEFAULT_TIER_ID: TierId = "chateau-dif";

export function getTier(id: TierId): Tier {
  return TIERS.find((t) => t.id === id) ?? TIERS[1];
}
