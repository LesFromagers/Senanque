import { ICON_SVG_PROPS, type IconProps } from "./types";

/**
 * The home mark: a belfry — pyramidal cap, twin louvers, apse roof —
 * flanked by two low arcade bays, standing on the ground line. This is
 * the only place the abbey silhouette appears as a functional UI icon
 * (the decorative arcade motif lives separately in components/brand/Arcade).
 */
export function BelfryIcon({ className }: IconProps) {
  return (
    <svg {...ICON_SVG_PROPS} className={className} aria-hidden="true">
      {/* ground line */}
      <line x1="2" y1="20.5" x2="22" y2="20.5" />
      {/* flanking bays */}
      <path d="M4 20.5v-4a2.5 2.5 0 0 1 5 0v4" />
      <path d="M15 20.5v-4a2.5 2.5 0 0 1 5 0v4" />
      {/* tower */}
      <rect x="9.5" y="9" width="5" height="11.5" />
      {/* pyramidal cap */}
      <path d="M8.5 9 12 4l3.5 5" />
      {/* twin louvers */}
      <line x1="11" y1="12" x2="11" y2="16" />
      <line x1="13" y1="12" x2="13" y2="16" />
    </svg>
  );
}
