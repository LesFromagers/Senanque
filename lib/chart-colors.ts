/**
 * Chart series color order per the brand sheet: lavender, plum, sage,
 * gold. References the same CSS custom properties app/globals.css defines
 * in @theme, so the palette never gets duplicated as raw hex here.
 *
 * Brand-sheet rule: Sage and Stone sit close in lightness and must never
 * be adjacent as chart series — differentiate with a dash pattern or
 * marker shape if they ever have to sit next to each other (e.g. a
 * plum-solid / stone-dashed pair, as used for line series that need a
 * muted reference line rather than a second data series).
 */
export const SERIES_COLOR_ORDER = [
  "var(--color-lavender)",
  "var(--color-plum)",
  "var(--color-sage)",
  "var(--color-gold)",
] as const;

export function seriesColor(index: number): string {
  return SERIES_COLOR_ORDER[index % SERIES_COLOR_ORDER.length];
}

export const REFERENCE_LINE_COLOR = "var(--color-stone)";
export const WARNING_COLOR = "var(--color-gold)";
