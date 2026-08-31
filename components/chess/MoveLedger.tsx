import type { MovePair } from "@/hooks/useChessGame";

type MoveLedgerProps = {
  movePairs: MovePair[];
  hintsRemaining: number;
  undosRemaining: number;
  canAct: boolean;
  onHint: () => void;
  onUndo: () => void;
  onResign: () => void;
  onNewGame: () => void;
};

function ActionLink({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        disabled
          ? "text-[13px] font-medium text-stone/60"
          : "text-[13px] font-medium text-plum hover:text-gold"
      }
    >
      {label}
    </button>
  );
}

/** The move ledger — a wrapping monospace line below the board, with the
 * game's quiet text-link controls (never buttons) on the right. Hint and
 * Undo aren't in the visual design study (it predates the engineering
 * brief's difficulty-tier allowances); they're placed here in the same
 * quiet-text-link idiom as Resign / New game rather than inventing a new
 * control style. */
export function MoveLedger({
  movePairs,
  hintsRemaining,
  undosRemaining,
  canAct,
  onHint,
  onUndo,
  onResign,
  onNewGame,
}: MoveLedgerProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-7 gap-y-3 border-t border-stone/40 pt-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[13px]">
        {movePairs.length === 0 && <span className="text-stone">Make the first move.</span>}
        {movePairs.map((m) => (
          <span key={m.n}>
            <span className="text-stone">{m.n}.</span> {m.w}{" "}
            {m.b !== null ? m.b : <span className="text-stone">…</span>}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 whitespace-nowrap">
        <ActionLink label={`Hint (${hintsRemaining})`} onClick={onHint} disabled={!canAct || hintsRemaining <= 0} />
        <ActionLink label={`Undo (${undosRemaining})`} onClick={onUndo} disabled={!canAct || undosRemaining <= 0} />
        <ActionLink label="Resign" onClick={onResign} disabled={!canAct} />
        <ActionLink label="New game" onClick={onNewGame} />
      </div>
    </div>
  );
}
