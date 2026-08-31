import type { GameStatus, Winner } from "@/hooks/useChessGame";

type CheckmateOverlayProps = {
  status: GameStatus;
  winner: Winner;
  onPlayAgain: () => void;
};

/**
 * A band across the board's middle third — not a modal. The final
 * position stays visible above and below it. Resign leads here too (with
 * Faria's line, per the brief: "Resign → the checkmate band with Faria's
 * line"). Draw isn't in the visual design study (only the two decisive
 * outcomes are), but chess.js can produce one (stalemate, threefold,
 * insufficient material) and the state model has to handle it somehow —
 * this is a minimal, voice-consistent addition, not part of the locked
 * spec.
 */
const COPY: Record<"faria" | "player" | "draw", { line: string; by: string }> = {
  faria: { line: "“I’m a priest, not a saint.”", by: "ABBÉ FARIA" },
  player: { line: "“I’m a Count, not a saint.”", by: "THE COUNT" },
  draw: { line: "“A draw is not a defeat. It is simply not yet an ending.”", by: "ABBÉ FARIA" },
};

export function CheckmateOverlay({ status, winner, onPlayAgain }: CheckmateOverlayProps) {
  if (status === "playing") return null;
  const copy = COPY[winner === "player" ? "player" : winner === "faria" ? "faria" : "draw"];

  return (
    <div
      className="absolute inset-x-0 border-t border-b border-marseille bg-[rgba(242,236,221,0.94)] px-6 py-[22px] text-center transition-opacity duration-[120ms]"
      style={{ top: "36%" }}
    >
      <p className="font-display text-[22px] font-light text-pretty text-marseille">{copy.line}</p>
      <p className="mt-2.5 text-[10px] tracking-label text-stone uppercase">{copy.by}</p>
      <button
        type="button"
        onClick={onPlayAgain}
        className="mt-3 text-[13px] font-medium text-plum hover:text-gold"
      >
        Play again
      </button>
    </div>
  );
}
