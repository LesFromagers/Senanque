"use client";

import { useEffect, useRef, useState } from "react";
import type { Square } from "chess.js";
import { useChessGame } from "@/hooks/useChessGame";
import { useFariaEngine } from "@/hooks/useFariaEngine";
import { getTier, DEFAULT_TIER_ID, type TierId } from "@/lib/chess/tiers";
import { FARIA_OPENING_LINE, fariaLineForMove } from "@/lib/chess/faria-commentary";
import { OPENING_BOOK, isInBook, nextBookPly } from "@/lib/chess/openings";
import { FariaStrip } from "./FariaStrip";
import { BoardWithGutters } from "./BoardWithGutters";
import { CheckmateOverlay } from "./CheckmateOverlay";
import { MoveLedger } from "./MoveLedger";

/**
 * Owns and wires together everything below the masthead: Faria's strip,
 * the opening-study picker, the board, and the move ledger. Kept as one
 * client component (rather than lifting state into the server page) since
 * Phase 1 is explicitly session-only — there's nothing here that needs to
 * survive a refresh, let alone reach a server.
 */
export function DantesGambitGame() {
  const game = useChessGame();
  const { requestMove } = useFariaEngine();

  const [tierId, setTierId] = useState<TierId>(DEFAULT_TIER_ID);
  const tier = getTier(tierId);
  const [hintsRemaining, setHintsRemaining] = useState(tier.hints);
  const [undosRemaining, setUndosRemaining] = useState(tier.undos);
  const [remark, setRemark] = useState<string>(FARIA_OPENING_LINE);
  // Carries the ply count it was drawn for, so it expires the moment
  // either side's next move changes the history — a derived render-time
  // check rather than an effect that clears it on every position change.
  const [rawHintMove, setRawHintMove] = useState<{ from: string; to: string; atPly: number } | null>(
    null,
  );
  const [openingId, setOpeningId] = useState<string>("");

  const lastTemplateId = useRef<string | undefined>(undefined);
  const thinking = useRef(false);
  const prevHistoryLength = useRef(0);

  const hintMove = rawHintMove && rawHintMove.atPly === game.verboseHistory.length ? rawHintMove : null;
  const sanHistory = game.verboseHistory.map((m) => m.san);
  const inBook = openingId ? isInBook(openingId, sanHistory) : false;
  const bookPly = openingId && game.turn === "w" ? nextBookPly(openingId, sanHistory) : null;

  // Faria's turn: ask the engine, then play whatever it returns.
  useEffect(() => {
    if (game.status !== "playing" || game.turn !== "b" || thinking.current) return;
    thinking.current = true;
    let cancelled = false;
    requestMove(game.fen, tier).then((mv) => {
      thinking.current = false;
      if (cancelled || !mv) return;
      game.applyMove(mv.from as Square, mv.to as Square, mv.promotion);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- game.applyMove is stable (useCallback)
  }, [game.status, game.turn, game.fen, tier, requestMove]);

  // Faria speaks once, after each of his own moves — never a transcript.
  useEffect(() => {
    const h = game.verboseHistory;
    if (h.length > prevHistoryLength.current) {
      const last = h[h.length - 1];
      if (last.color === "b" && !last.san.includes("#")) {
        const line = fariaLineForMove(last, lastTemplateId.current);
        lastTemplateId.current = line.id;
        setRemark(line.text);
      }
    }
    prevHistoryLength.current = h.length;
  }, [game.verboseHistory]);

  function resetGameState(nextTier = tier) {
    game.newGame();
    setHintsRemaining(nextTier.hints);
    setUndosRemaining(nextTier.undos);
    setRemark(FARIA_OPENING_LINE);
    setRawHintMove(null);
    lastTemplateId.current = undefined;
  }

  function handleTierChange(next: TierId) {
    setTierId(next);
    resetGameState(getTier(next));
  }

  function handleOpeningChange(next: string) {
    setOpeningId(next);
    resetGameState();
  }

  async function handleHint() {
    if (hintsRemaining <= 0 || game.status !== "playing" || game.turn !== "w") return;
    setHintsRemaining((n) => n - 1);
    const atPly = game.verboseHistory.length;
    // A hint should be genuinely useful, not scaled down by the tier's own
    // deliberate weakness — full strength, still capped for mobile perf.
    const mv = await requestMove(game.fen, { ...tier, elo: null, searchMs: 800, maxDepth: 14 });
    if (mv) setRawHintMove({ from: mv.from, to: mv.to, atPly });
  }

  function handleUndo() {
    if (undosRemaining <= 0) return;
    setUndosRemaining((n) => n - 1);
    game.undoMove();
  }

  const gameInProgress = game.verboseHistory.length > 0 && game.status === "playing";
  const canAct = game.status === "playing";

  return (
    <div className="flex flex-col gap-7">
      <FariaStrip
        tierId={tierId}
        remark={remark}
        gameInProgress={gameInProgress}
        onTierChange={handleTierChange}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
        <span className="text-[11px] tracking-label text-stone uppercase">Opening study</span>
        <select
          value={openingId}
          onChange={(e) => handleOpeningChange(e.target.value)}
          className="rounded-sm border border-stone/60 bg-transparent px-2 py-1 text-charcoal"
        >
          <option value="">Not studying</option>
          {OPENING_BOOK.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        {openingId && (
          <span className="text-stone">
            {inBook ? "In book — the sage ring is the next move." : "Left the book — just chess from here."}
          </span>
        )}
      </div>

      <BoardWithGutters
        fen={game.fen}
        selected={game.selected}
        legalTargets={game.legalTargets}
        lastMove={game.lastMove}
        hintMove={hintMove}
        bookMove={bookPly ? { from: bookPly.from, to: bookPly.to } : null}
        canDragWhite={game.status === "playing" && game.turn === "w"}
        onSquareClick={(sq) => game.selectSquare(sq as Square)}
        onPieceDrop={(from, to) => !!game.applyMove(from as Square, to as Square)}
        overlay={
          <CheckmateOverlay status={game.status} winner={game.winner} onPlayAgain={() => resetGameState()} />
        }
      />

      <MoveLedger
        movePairs={game.movePairs}
        hintsRemaining={hintsRemaining}
        undosRemaining={undosRemaining}
        canAct={canAct}
        onHint={handleHint}
        onUndo={handleUndo}
        onResign={game.resign}
        onNewGame={() => resetGameState()}
      />
    </div>
  );
}
