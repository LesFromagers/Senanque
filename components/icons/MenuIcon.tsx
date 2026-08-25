import { ICON_SVG_PROPS, type IconProps } from "./types";

/** Mobile nav trigger — three stacked bars. Pairs with CloseIcon for the open state. */
export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...ICON_SVG_PROPS} className={className} aria-hidden="true">
      <line x1="3.5" y1="6.5" x2="20.5" y2="6.5" />
      <line x1="3.5" y1="12" x2="20.5" y2="12" />
      <line x1="3.5" y1="17.5" x2="20.5" y2="17.5" />
    </svg>
  );
}
