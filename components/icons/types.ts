/**
 * Shared icon spec (brand sheet): 24px grid, 1.25px stroke, square caps,
 * monochrome currentColor. Color state is controlled purely via className
 * — text-charcoal (default), text-plum (active/hover), text-stone (disabled).
 */
export type IconProps = {
  className?: string;
};

export const ICON_SVG_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
};
