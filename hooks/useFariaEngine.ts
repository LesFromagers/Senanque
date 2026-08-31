"use client";

import { useCallback, useEffect, useRef } from "react";
import { FariaEngine, type EngineMove } from "@/lib/chess/engine";
import type { Tier } from "@/lib/chess/tiers";

/** Owns one FariaEngine (one Worker) for the component's lifetime and
 * disposes it on unmount — a fresh worker per game would re-pay the ~7MB
 * engine load on every "New game". */
export function useFariaEngine() {
  const engineRef = useRef<FariaEngine | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const requestMove = useCallback((fen: string, tier: Tier): Promise<EngineMove | null> => {
    if (!FariaEngine.isSupported()) return Promise.resolve(null);
    if (!engineRef.current) engineRef.current = new FariaEngine();
    return engineRef.current.bestMove(fen, tier);
  }, []);

  return { requestMove };
}
