import { ICON_SVG_PROPS, type IconProps } from "@/components/icons/types";

/**
 * Marks a season with a Heisman winner on the roster. Gold, not Garnet —
 * this is a talent-layer signal available across the whole site's icon
 * language (components/icons/types.ts's 1.25px/square-cap spec), not one
 * of the Ledger's Garnet-scoped marks.
 */
export function HeismanTrophyIcon({ className }: IconProps) {
  return (
    <svg {...ICON_SVG_PROPS} className={className} aria-hidden="true">
      <path d="M8 4h8v4a4 4 0 0 1-4 4 4 4 0 0 1-4-4V4Z" />
      <path d="M8 5H5v2a3 3 0 0 0 3 3" />
      <path d="M16 5h3v2a3 3 0 0 1-3 3" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <path d="M9 20h6" />
      <path d="M9 20c0-2 1-3 3-3s3 1 3 3" />
    </svg>
  );
}
