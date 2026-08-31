"use client";

import { useMemo, type CSSProperties } from "react";
import { Chessboard, type PieceRenderObject } from "react-chessboard";
import {
  BOARD_TONES,
  LIGHT_PIECE_CONTOUR,
  DARK_PIECE_HALO,
} from "@/lib/chess/board-tones";
import { hewnSquareStyle, isLightSquare } from "@/lib/chess/square-jitter";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ALL_SQUARES = FILES.flatMap((f) => [8, 7, 6, 5, 4, 3, 2, 1].map((r) => `${f}${r}`));

/** Unicode glyphs, one per FEN piece code — Literata, tonal color (not
 * black/white), sized to fill the square. This is the design's locked
 * treatment, not a placeholder: no piece set is being commissioned. */
const GLYPH: Record<string, string> = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};

function buildPieces(): PieceRenderObject {
  const pieces: PieceRenderObject = {};
  for (const [code, glyph] of Object.entries(GLYPH)) {
    const isWhite = code[0] === "w";
    pieces[code] = ({ square }: { square?: string } = {}) => {
      const onWalnut = square ? !isLightSquare(square) : false;
      return (
        <span
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display, Literata, Georgia, serif)",
            // Container-query unit, not a viewport unit: scales with the
            // board's own rendered width (1 square = 12.5% of it) so the
            // glyph tracks the square continuously across breakpoints
            // instead of jumping between fixed per-breakpoint px values.
            fontSize: "9cqi",
            lineHeight: 1,
            color: isWhite ? BOARD_TONES.lightPiece : BOARD_TONES.darkPiece,
            textShadow: isWhite ? LIGHT_PIECE_CONTOUR : onWalnut ? DARK_PIECE_HALO : "none",
            userSelect: "none",
          }}
        >
          {glyph}
        </span>
      );
    };
  }
  return pieces;
}

const PIECES = buildPieces();

export type ChessBoardProps = {
  fen: string;
  selected: string | null;
  legalTargets: string[];
  lastMove: { from: string; to: string } | null;
  hintMove?: { from: string; to: string } | null;
  bookMove?: { from: string; to: string } | null;
  onSquareClick: (square: string) => void;
  onPieceDrop: (from: string, to: string) => boolean;
  canDragWhite: boolean;
};

export function ChessBoard({
  fen,
  selected,
  legalTargets,
  lastMove,
  hintMove,
  bookMove,
  onSquareClick,
  onPieceDrop,
  canDragWhite,
}: ChessBoardProps) {
  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    for (const sq of ALL_SQUARES) {
      const style = hewnSquareStyle(sq, {
        selected: sq === selected,
        legalMove: legalTargets.includes(sq),
        lastMove: sq === lastMove?.from || sq === lastMove?.to,
        hint: sq === hintMove?.from || sq === hintMove?.to,
        book: sq === bookMove?.from || sq === bookMove?.to,
      });
      styles[sq] = { background: style.background, boxShadow: style.boxShadow };
    }
    return styles;
  }, [selected, legalTargets, lastMove, hintMove, bookMove]);

  return (
    <div
      className="border border-stone/80"
      style={{ containerType: "inline-size", backgroundColor: BOARD_TONES.limestone }}
    >
      <Chessboard
        options={{
          id: "dantes-gambit-board",
          position: fen,
          boardOrientation: "white",
          showNotation: false,
          allowDragOffBoard: false,
          animationDurationInMs: 0,
          pieces: PIECES,
          squareStyle: { outline: "0.5px solid rgba(163,159,145,0.45)", outlineOffset: "-0.5px" },
          squareStyles,
          canDragPiece: ({ piece }) => canDragWhite && piece.pieceType.startsWith("w"),
          onSquareClick: ({ square }) => onSquareClick(square),
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            targetSquare ? onPieceDrop(sourceSquare, targetSquare) : false,
        }}
      />
    </div>
  );
}
