"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Chess, DEFAULT_POSITION, type Move, type Square } from "chess.js";

export type GameStatus = "playing" | "checkmate" | "resigned" | "draw";
export type Winner = "player" | "faria" | null;
export type MovePair = { n: number; w: string; b: string | null };

/**
 * Wraps a chess.js `Chess` instance with the state a Phase 1 UI needs:
 * position, selection, legal targets, move history, and game-over status.
 * Player is always White, Faria is always Black — the engine move itself
 * (lib/chess/engine.ts) is driven from outside this hook by watching
 * `turn === "b" && status === "playing"`, so this hook stays engine-agnostic
 * and is just as usable for two-human or opening-study contexts.
 */
export function useChessGame() {
  const gameRef = useRef(new Chess());
  // The starting FEN, not a ref read — `gameRef` is freshly constructed
  // above with no FEN argument, so its initial position is exactly this.
  const [fen, setFen] = useState(DEFAULT_POSITION);
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [winner, setWinner] = useState<Winner>(null);
  const [verboseHistory, setVerboseHistory] = useState<Move[]>([]);

  const turn = useMemo(() => (fen.split(" ")[1] as "w" | "b") ?? "w", [fen]);

  // A read-only snapshot for render-time reads (legal targets, check
  // status) — `gameRef.current` itself is mutable and must only be read
  // from event handlers/effects, never during render.
  const snapshot = useMemo(() => new Chess(fen), [fen]);

  const legalTargets = useMemo<Square[]>(() => {
    if (!selected) return [];
    return snapshot.moves({ square: selected, verbose: true }).map((m) => m.to as Square);
  }, [selected, snapshot]);

  const checkGameOver = useCallback(() => {
    const g = gameRef.current;
    if (g.isCheckmate()) {
      // The side to move is the side that's mated — the other side won.
      setStatus("checkmate");
      setWinner(g.turn() === "w" ? "faria" : "player");
      return true;
    }
    if (g.isDraw()) {
      setStatus("draw");
      setWinner(null);
      return true;
    }
    return false;
  }, []);

  const syncFromEngine = useCallback(() => {
    const g = gameRef.current;
    setFen(g.fen());
    setVerboseHistory(g.history({ verbose: true }));
    setSelected(null);
    checkGameOver();
  }, [checkGameOver]);

  // No internal `status` guard here: every call site already checks it
  // fresh before calling — `selectSquare` and `canDragPiece` (via the
  // `canDragWhite` prop, computed each render from `status`) block player
  // input once the game is over, and the Faria-engine effect's own cleanup
  // (its dependency array includes `status`) discards a belated engine
  // reply the instant `status` changes, e.g. on resignation.
  const applyMove = useCallback(
    (from: Square, to: Square, promotion: string = "q"): Move | null => {
      const g = gameRef.current;
      let mv: Move | null = null;
      try {
        mv = g.move({ from, to, promotion });
      } catch {
        mv = null;
      }
      if (!mv) return null;
      setLastMove({ from: mv.from as Square, to: mv.to as Square });
      syncFromEngine();
      return mv;
    },
    [syncFromEngine],
  );

  const selectSquare = useCallback(
    (square: Square) => {
      if (status !== "playing" || turn !== "w") return;
      const g = gameRef.current;
      if (selected && legalTargets.includes(square)) {
        applyMove(selected, square);
        return;
      }
      const piece = g.get(square);
      setSelected(piece && piece.color === "w" ? square : null);
    },
    [status, turn, selected, legalTargets, applyMove],
  );

  const resign = useCallback(() => {
    setStatus("resigned");
    setWinner("faria");
    setSelected(null);
  }, []);

  const newGame = useCallback(() => {
    gameRef.current.reset();
    setFen(gameRef.current.fen());
    setSelected(null);
    setLastMove(null);
    setStatus("playing");
    setWinner(null);
    setVerboseHistory([]);
  }, []);

  /** Undo a full round trip (Faria's reply + the player's move before it)
   * so the player can retry their move — or just the player's own move if
   * Faria hasn't replied yet. */
  const undoMove = useCallback(() => {
    const g = gameRef.current;
    if (g.history().length === 0) return;
    const undoingFariaReply = g.turn() === "w"; // it's White's turn => Black just moved
    g.undo();
    if (undoingFariaReply && g.history().length > 0) g.undo();
    const h = g.history({ verbose: true });
    const last = h[h.length - 1];
    setLastMove(last ? { from: last.from as Square, to: last.to as Square } : null);
    setFen(g.fen());
    setVerboseHistory(h);
    setSelected(null);
    setStatus("playing");
    setWinner(null);
  }, []);

  const movePairs = useMemo<MovePair[]>(() => {
    const pairs: MovePair[] = [];
    for (let i = 0; i < verboseHistory.length; i += 2) {
      pairs.push({
        n: i / 2 + 1,
        w: verboseHistory[i]?.san ?? "",
        b: verboseHistory[i + 1]?.san ?? null,
      });
    }
    return pairs;
  }, [verboseHistory]);

  return {
    fen,
    turn,
    selected,
    legalTargets,
    lastMove,
    status,
    winner,
    verboseHistory,
    movePairs,
    isCheck: snapshot.isCheck(),
    selectSquare,
    applyMove,
    resign,
    newGame,
    undoMove,
  };
}
