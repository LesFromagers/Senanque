import { ICON_SVG_PROPS, type IconProps } from "./types";

/**
 * Rising/falling direction indicator (Fed funds, consumer sentiment,
 * Oklahoma coincident index). For "falling", rotate 180° via className
 * rather than building a second glyph.
 */
export function TrendIcon({ className }: IconProps) {
  return (
    <svg {...ICON_SVG_PROPS} className={className} aria-hidden="true">
      <path d="M3 17 9.5 10.5 13.5 14.5 21 6" />
      <path d="M15 6h6v6" />
    </svg>
  );
}
