/**
 * Board material tones for The Dantès Gambit — deliberately NOT brand
 * tokens. Per the design brief, these are surface tones derived from the
 * existing palette (Oat shaded toward Stone; Charcoal warmed), kept local
 * to the chess feature so the one-accent-per-spoke rule (Marseille, see
 * app/globals.css) survives a wood-and-stone board. Never add these to
 * `@theme` or `SERIES_COLOR_ORDER`.
 */
export const BOARD_TONES = {
  /** Light squares — Oat shaded toward Stone. */
  limestone: "#E6DFCC",
  /** Dark squares — Charcoal warmed; the only warm-brown in the app, board-only. */
  walnut: "#7A6552",
  /** Light pieces — limestone-pale, not pure white. */
  lightPiece: "#F6F1E4",
  /** Dark pieces — deep walnut, not pure black. */
  darkPiece: "#3B2F26",
  /** Opaque contour for light pieces (translucent blur fails contrast on limestone). */
  pieceContour: "#6B5647",
  /** Mortar-free joint rule between hewn stones. */
  jointRule: "rgba(163,159,145,0.55)",
} as const;

/**
 * Grain — CSS gradients layered under a square's own tint/fracture/joint
 * (see lib/chess/square-jitter.ts), no image files. Limestone reads as a
 * fine crossed speckle (three hairline gradients); walnut reads as one
 * directional sawn grain.
 */
export const LIMESTONE_GRAIN =
  "repeating-linear-gradient(112deg, rgba(107,86,71,0.055) 0 1px, rgba(107,86,71,0) 1px 4px), " +
  "repeating-linear-gradient(28deg, rgba(107,86,71,0.04) 0 1px, rgba(107,86,71,0) 1px 6px), " +
  "repeating-linear-gradient(74deg, rgba(58,56,51,0.028) 0 1px, rgba(58,56,51,0) 1px 9px)";

export const WALNUT_GRAIN =
  "repeating-linear-gradient(92deg, rgba(59,47,38,0.12) 0 1px, rgba(59,47,38,0) 1px 5px), " +
  "repeating-linear-gradient(92deg, rgba(246,241,228,0.07) 0 1px, rgba(246,241,228,0) 1px 13px)";

/** Opaque 6-offset text-shadow contour for light pieces — a translucent
 * blur fails contrast (1.18:1) against limestone. */
export const LIGHT_PIECE_CONTOUR = [
  `1px 0 0 ${BOARD_TONES.pieceContour}`,
  `-1px 0 0 ${BOARD_TONES.pieceContour}`,
  `0 1px 0 ${BOARD_TONES.pieceContour}`,
  `0 -1px 0 ${BOARD_TONES.pieceContour}`,
  `1px 1px 0 ${BOARD_TONES.pieceContour}`,
  `-1px -1px 0 ${BOARD_TONES.pieceContour}`,
].join(", ");

/** Faint pale halo for dark pieces — walnut squares only, the sole assist. */
export const DARK_PIECE_HALO = "0 0 1.4px rgba(246,241,228,0.5)";

/** Interaction chrome — Marseille only, never the board surface. */
export const CHESS_CHROME = {
  legalDot: "rgba(53,86,90,0.45)",
  selectedRing: "inset 0 0 0 3px var(--color-marseille)",
  lastMoveWash: "linear-gradient(rgba(53,86,90,0.16), rgba(53,86,90,0.16))",
} as const;
