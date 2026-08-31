import type { ReactNode } from "react";
import { ChessBoard, type ChessBoardProps } from "./ChessBoard";

const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

/**
 * Ranks 8→1 in both side gutters (two, not one — a board this wide in a
 * single column leaves the right edge unanchored with only one), files
 * a–h below. Gutters are 16px desktop, shrinking to 10px on phone; files
 * stay full size at every breakpoint.
 */
export function BoardWithGutters(props: ChessBoardProps & { overlay?: ReactNode }) {
  const { overlay, ...boardProps } = props;
  return (
    <div className="flex items-stretch gap-2.5">
      <div className="grid w-2.5 grid-rows-8 text-right text-[11px] tracking-[0.14em] text-stone sm:w-4">
        {RANKS.map((r) => (
          <span key={r} className="flex items-center justify-end">
            {r}
          </span>
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="relative">
          <ChessBoard {...boardProps} />
          {overlay}
        </div>
        <div className="grid grid-cols-8 text-center text-[11px] tracking-label text-stone uppercase">
          {FILES.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      </div>
      <div className="grid w-2.5 grid-rows-8 text-[11px] tracking-[0.14em] text-stone sm:w-4">
        {RANKS.map((r) => (
          <span key={r} className="flex items-center">
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}
