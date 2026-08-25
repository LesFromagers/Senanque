import { ICON_SVG_PROPS, type IconProps } from "./types";

/** The mobile nav toggle, open state. */
export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...ICON_SVG_PROPS} className={className} aria-hidden="true">
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}
