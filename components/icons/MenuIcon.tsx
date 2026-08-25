import { ICON_SVG_PROPS, type IconProps } from "./types";

/** Three stacked hairlines — the mobile nav toggle, closed state. */
export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...ICON_SVG_PROPS} className={className} aria-hidden="true">
      <line x1="3" y1="7" x2="21" y2="7" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="17" x2="21" y2="17" />
    </svg>
  );
}
