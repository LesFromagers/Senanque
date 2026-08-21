import { ICON_SVG_PROPS, type IconProps } from "./types";

/** "Open" — used on every outbound "Open dashboard" project-card link. */
export function ExternalLinkIcon({ className }: IconProps) {
  return (
    <svg {...ICON_SVG_PROPS} className={className} aria-hidden="true">
      <path d="M9 6H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3" />
      <path d="M13 4h7v7" />
      <path d="M20 4 11 13" />
    </svg>
  );
}
