import { ICON_SVG_PROPS, type IconProps } from "./types";

/** Mobile nav dismiss — pairs with MenuIcon for the closed state. */
export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...ICON_SVG_PROPS} className={className} aria-hidden="true">
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}
