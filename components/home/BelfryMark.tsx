/**
 * The Sénanque belfry drawn at scale for the homepage hero — pyramidal
 * cap, lavender louvered shaft, oat apse roof. Same crop (viewBox
 * "7 3.6 10 12") as the small nav BelfryIcon, but drawn as its own mark
 * rather than the 24px functional-icon spec: two hand-tuned stroke
 * weights (mobile/desktop), because stroke doesn't scale linearly with
 * size across those two contexts. See PracticeArcade, which is the only
 * place this is used.
 *
 * The cap's apex sits exactly on the viewBox's top edge (y=3.6) and the
 * roof's base corners sit exactly on its bottom edge (y=15.6), so the
 * stroke's natural bulge past each vertex would otherwise be clipped
 * flat by the SVG viewport — `overflow: visible` lets it render past
 * the box instead of chopping the peak square.
 */
export function BelfryMark({
  width,
  height,
  strokeWidth,
  className,
}: {
  width: number;
  height: number;
  strokeWidth: number;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="7 3.6 10 12"
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      style={{ overflow: "visible" }}
      className={className}
      aria-hidden="true"
    >
      <path d="M7 15.6 9.4 11.8h5.2L17 15.6z" className="fill-oat stroke-plum" />
      <path d="M9.7 7.2h4.6v4.6H9.7z" className="fill-lavender stroke-plum" />
      <path d="M8.4 7.2 12 3.6l3.6 3.6z" className="fill-lavender stroke-plum" />
      <path d="M11 8.4v3" className="stroke-plum" />
      <path d="M13 8.4v3" className="stroke-plum" />
    </svg>
  );
}
