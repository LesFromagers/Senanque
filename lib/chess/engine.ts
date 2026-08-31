import type { Tier } from "./tiers";

const ENGINE_URL = "/stockfish/stockfish-18-lite-single.js";

export type EngineMove = { from: string; to: string; promotion?: string };

function parseUciMove(uci: string): EngineMove {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}

/**
 * Thin wrapper around the vendored Stockfish 18 (lite, single-threaded)
 * Web Worker — see public/stockfish/README.md for why this build. Speaks
 * plain UCI over postMessage; every public method here is the minimum
 * Faria's play needs, not a general UCI client.
 *
 * Strength targeting uses `UCI_LimitStrength` + `UCI_Elo` (see lib/chess/
 * tiers.ts) rather than raw Skill Level, and every `bestMove()` call caps
 * both search depth and think time so a phone never gets stuck on a long
 * think — including at the nominally "uncapped" top tier.
 */
export class FariaEngine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  /** Keyed off the actual UCI-relevant strength setting, not `tier.id` —
   * a one-off "play at full strength for a hint" request reuses the
   * current tier's `id` with `elo` overridden, and must still trigger a
   * reconfigure. */
  private configuredStrengthKey: string | null = null;
  /** Serializes bestMove() calls onto one UCI conversation — Stockfish
   * doesn't support overlapping `go` commands on a single engine process,
   * and a rapid double-click of "Hint" (or a hint racing Faria's own move)
   * would otherwise send two before the first's `bestmove` reply arrives. */
  private queue: Promise<unknown> = Promise.resolve();

  /** True only in the browser — this class must never be constructed
   * during server-side rendering. */
  static isSupported(): boolean {
    return typeof window !== "undefined" && typeof Worker !== "undefined";
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(ENGINE_URL);
    }
    return this.worker;
  }

  private init(): Promise<void> {
    if (this.ready) return this.ready;
    const worker = this.ensureWorker();
    this.ready = new Promise((resolve, reject) => {
      const onMessage = (e: MessageEvent<string>) => {
        if (typeof e.data === "string" && e.data.trim() === "uciok") {
          worker.postMessage("isready");
        }
        if (typeof e.data === "string" && e.data.trim() === "readyok") {
          worker.removeEventListener("message", onMessage);
          resolve();
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", (e) => reject(e));
      worker.postMessage("uci");
    });
    return this.ready;
  }

  private async configureTier(tier: Pick<Tier, "elo">): Promise<void> {
    await this.init();
    const key = tier.elo != null ? `elo:${tier.elo}` : "full";
    if (this.configuredStrengthKey === key) return;
    const worker = this.ensureWorker();
    worker.postMessage("setoption name Threads value 1");
    if (tier.elo != null) {
      worker.postMessage("setoption name UCI_LimitStrength value true");
      worker.postMessage(`setoption name UCI_Elo value ${tier.elo}`);
    } else {
      worker.postMessage("setoption name UCI_LimitStrength value false");
    }
    this.configuredStrengthKey = key;
  }

  /** Ask Faria for his move in `fen`, tuned to `tier`. Resolves with a
   * parsed UCI move, or null if the worker errors or is unsupported. Calls
   * queue behind one another rather than overlapping. */
  bestMove(fen: string, tier: Tier): Promise<EngineMove | null> {
    const run = this.queue.then(() => this.bestMoveNow(fen, tier));
    // Swallow rejections in the chain itself so one failed request doesn't
    // wedge every request queued after it; the caller's own promise (the
    // one returned from `run`) still rejects/resolves normally.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async bestMoveNow(fen: string, tier: Tier): Promise<EngineMove | null> {
    if (!FariaEngine.isSupported()) return null;
    await this.configureTier(tier);
    const worker = this.ensureWorker();

    return new Promise<EngineMove | null>((resolve) => {
      const onMessage = (e: MessageEvent<string>) => {
        if (typeof e.data !== "string") return;
        const match = e.data.match(/^bestmove\s+(\S+)/);
        if (!match) return;
        worker.removeEventListener("message", onMessage);
        if (match[1] === "(none)") {
          resolve(null);
          return;
        }
        resolve(parseUciMove(match[1]));
      };
      worker.addEventListener("message", onMessage);
      worker.postMessage(`position fen ${fen}`);
      // Both limits are set; the engine stops at whichever it hits first —
      // that's the mobile-performance cap the brief asks for, applied at
      // every tier, not just the uncapped one.
      worker.postMessage(`go depth ${tier.maxDepth} movetime ${tier.searchMs}`);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.configuredStrengthKey = null;
    this.queue = Promise.resolve();
  }
}
