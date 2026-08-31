import type { Move } from "chess.js";

/**
 * Faria's Phase 1 commentary — simple templated/rule-based lines keyed off
 * the shape of his own move (per the engineering brief; adaptive,
 * position-aware commentary is a Phase 2 concern once the Claude API layer
 * is added). Voice per the design brief: calm, gentle, mentor not judge —
 * describes the move and lets the player draw the conclusion.
 *
 * Anti-patterns, held to deliberately: no praise inflation ("Excellent!"),
 * no engine-speak (centipawns, "blunder", evaluations), no novel-quoting
 * except at checkmate (see components/chess/CheckmateOverlay.tsx), never
 * more than two sentences.
 */
type Template = { id: string; text: (san: string) => string };

const CHECK: Template[] = [
  { id: "check-1", text: (san) => `I'll play ${san}. Look at your king before you look at anything else.` },
  { id: "check-2", text: (san) => `${san}. A check is a question. You still have to answer it.` },
];

const CAPTURE: Template[] = [
  { id: "capture-1", text: (san) => `I'll play ${san}. It was offered; I took it.` },
  { id: "capture-2", text: (san) => `${san}. Everything on the board belongs to whoever can hold it.` },
];

const CASTLE: Template[] = [
  { id: "castle-1", text: () => "I'll bring my king to the corner. It is safer there than in the center, and I have no more use for the center today." },
  { id: "castle-2", text: () => "The king is castled. A man who has been in a cell learns to value a wall." },
];

const DEVELOP: Template[] = [
  { id: "develop-1", text: (san) => `I'll play ${san}. A piece that has never moved has never done anything.` },
  { id: "develop-2", text: (san) => `${san}. Patience does not mean waiting — it means preparing while you wait.` },
];

const PAWN: Template[] = [
  { id: "pawn-1", text: (san) => `I'll play ${san}. A pawn moved is a pawn that cannot come back.` },
  { id: "pawn-2", text: (san) => `${san}. Small steps. I have made a great many of those.` },
];

const QUEEN: Template[] = [
  { id: "queen-1", text: (san) => `I'll play ${san}. The queen goes out only when she is asked, and only as far as she is asked.` },
];

const QUIET: Template[] = [
  { id: "quiet-1", text: (san) => `I'll play ${san}. There is no hurry. There has never been any hurry.` },
  { id: "quiet-2", text: (san) => `${san}. I would not have played it yesterday. Today, I would.` },
  { id: "quiet-3", text: (san) => `I'll play ${san}, and wait to see what you make of it.` },
];

function categoryFor(move: Move): Template[] {
  if (move.san.includes("#")) return []; // handled by the checkmate overlay, not here
  if (move.san.includes("+")) return CHECK;
  if (move.flags.includes("c") || move.flags.includes("e")) return CAPTURE;
  if (move.flags.includes("k") || move.flags.includes("q")) return CASTLE;
  if (move.piece === "q") return QUEEN;
  if (move.piece === "n" || move.piece === "b") return DEVELOP;
  if (move.piece === "p") return PAWN;
  return QUIET;
}

/** Picks a line for Faria's move, avoiding an immediate repeat of `avoidId`
 * (the previous line's template id) when the category offers a choice. */
export function fariaLineForMove(move: Move, avoidId?: string): { id: string; text: string } {
  const pool = categoryFor(move);
  const bank = pool.length ? pool : QUIET;
  const choices = bank.length > 1 ? bank.filter((t) => t.id !== avoidId) : bank;
  const chosen = choices[Math.floor(Math.random() * choices.length)] ?? bank[0];
  return { id: chosen.id, text: chosen.text(move.san) };
}

/** Shown before Faria has moved at all. */
export const FARIA_OPENING_LINE =
  "Sit. We have time — more of it than either of us would like.";
