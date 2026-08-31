import { Chess } from "chess.js";

/**
 * The opening book — 25 curated openings, each a short line of standard
 * theory in SAN. Static data, loaded once; per the engineering brief this
 * is a negligible performance cost regardless of count (Stockfish's WASM
 * engine is the actual thing to watch for mobile perf, see lib/chess/
 * engine.ts). The three required anchors (French Defense, Mediterranean
 * Defense, St. George Defense) are listed first.
 */
export type Opening = {
  id: string;
  name: string;
  eco: string;
  /** SAN moves from the starting position. */
  moves: string[];
};

export const OPENING_BOOK: Opening[] = [
  { id: "french", name: "French Defense", eco: "C00", moves: ["e4", "e6", "d4", "d5"] },
  {
    id: "mediterranean",
    name: "Mediterranean Defense",
    eco: "C00",
    moves: ["e4", "e6", "d4", "d5", "Nc3", "Nf6"],
  },
  { id: "st-george", name: "St. George Defense", eco: "B00", moves: ["e4", "a6", "d4", "b5"] },
  {
    id: "french-classical",
    name: "French Defense: Classical Variation",
    eco: "C11",
    moves: ["e4", "e6", "d4", "d5", "Nc3", "Nf6", "Bg5", "Be7"],
  },
  {
    id: "french-rubinstein",
    name: "French Defense: Rubinstein Variation",
    eco: "C10",
    moves: ["e4", "e6", "d4", "d5", "Nc3", "dxe4", "Nxe4"],
  },
  { id: "italian", name: "Italian Game", eco: "C50", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"] },
  { id: "sicilian", name: "Sicilian Defense", eco: "B20", moves: ["e4", "c5"] },
  {
    id: "sicilian-najdorf",
    name: "Sicilian Defense: Najdorf Variation",
    eco: "B90",
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
  },
  {
    id: "sicilian-dragon",
    name: "Sicilian Defense: Dragon Variation",
    eco: "B70",
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6"],
  },
  {
    id: "ruy-lopez",
    name: "Ruy Lopez (Spanish Game)",
    eco: "C60",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
  },
  { id: "caro-kann", name: "Caro-Kann Defense", eco: "B10", moves: ["e4", "c6", "d4", "d5"] },
  { id: "scandinavian", name: "Scandinavian Defense", eco: "B01", moves: ["e4", "d5"] },
  { id: "queens-gambit", name: "Queen's Gambit", eco: "D06", moves: ["d4", "d5", "c4"] },
  {
    id: "queens-gambit-declined",
    name: "Queen's Gambit Declined",
    eco: "D30",
    moves: ["d4", "d5", "c4", "e6"],
  },
  { id: "kings-gambit", name: "King's Gambit", eco: "C30", moves: ["e4", "e5", "f4"] },
  { id: "english", name: "English Opening", eco: "A10", moves: ["c4"] },
  { id: "pirc", name: "Pirc Defense", eco: "B07", moves: ["e4", "d6", "d4", "Nf6", "Nc3", "g6"] },
  { id: "modern", name: "Modern Defense", eco: "B06", moves: ["e4", "g6"] },
  { id: "alekhine", name: "Alekhine's Defense", eco: "B02", moves: ["e4", "Nf6"] },
  { id: "vienna", name: "Vienna Game", eco: "C25", moves: ["e4", "e5", "Nc3"] },
  {
    id: "scotch",
    name: "Scotch Game",
    eco: "C44",
    moves: ["e4", "e5", "Nf3", "Nc6", "d4"],
  },
  {
    id: "nimzo-indian",
    name: "Nimzo-Indian Defense",
    eco: "E20",
    moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"],
  },
  {
    id: "kings-indian",
    name: "King's Indian Defense",
    eco: "E60",
    moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7"],
  },
  {
    id: "london",
    name: "London System",
    eco: "D02",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4"],
  },
  { id: "catalan", name: "Catalan Opening", eco: "E00", moves: ["d4", "Nf6", "c4", "e6", "g3"] },
];

export type OpeningPly = { san: string; from: string; to: string; promotion?: string };

const verboseCache = new Map<string, OpeningPly[]>();

/** Replays an opening's SAN line once, from the start position, so we can
 * highlight its next move by square rather than just by SAN text. */
function verboseLine(opening: Opening): OpeningPly[] {
  const cached = verboseCache.get(opening.id);
  if (cached) return cached;
  const chess = new Chess();
  const plies: OpeningPly[] = opening.moves.map((san) => {
    const mv = chess.move(san);
    return { san: mv.san, from: mv.from, to: mv.to, promotion: mv.promotion };
  });
  verboseCache.set(opening.id, plies);
  return plies;
}

/** True while `sanHistory` (the game so far) is exactly a prefix of the
 * chosen opening's book line. */
export function isInBook(openingId: string, sanHistory: string[]): boolean {
  const opening = OPENING_BOOK.find((o) => o.id === openingId);
  if (!opening) return false;
  if (sanHistory.length >= opening.moves.length) return false;
  return sanHistory.every((san, i) => san === opening.moves[i]);
}

/** The next book move to highlight, or null once the game has left the
 * book (deviated, or the line has run out). */
export function nextBookPly(openingId: string, sanHistory: string[]): OpeningPly | null {
  if (!isInBook(openingId, sanHistory)) return null;
  const opening = OPENING_BOOK.find((o) => o.id === openingId)!;
  return verboseLine(opening)[sanHistory.length] ?? null;
}
