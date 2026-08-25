import { ICON_SVG_PROPS, type IconProps } from "./types";

/** Tap-to-expand affordance — the Ledger's mobile row detail toggle rotates this 180° when open. */
export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...ICON_SVG_PROPS} className={className} aria-hidden="true">
      <path d="M5 9l7 7 7-7" />
    </svg>
  );
}
