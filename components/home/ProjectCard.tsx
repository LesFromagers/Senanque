import Link from "next/link";
import { ExternalLinkIcon } from "@/components/icons/ExternalLinkIcon";
import { SERIES_COLOR_ORDER } from "@/lib/chart-colors";
import { BOARD_TONES, LIGHT_PIECE_CONTOUR, DARK_PIECE_HALO } from "@/lib/chess/board-tones";
import type { ProjectMeta } from "@/lib/projects";

const BAR_HEIGHTS = [40, 60, 30, 75, 50, 65, 45];
const BAR_W = 32;
const GAP = 10;
const CHART_W = BAR_HEIGHTS.length * BAR_W + (BAR_HEIGHTS.length - 1) * GAP;
const CHART_H = 100;

/** Bars, optionally with a trend line — one SVG so the line and bars
 * always share the same coordinate space regardless of card width. */
function BarsThumbnail({ trend }: { trend: boolean }) {
  const points = BAR_HEIGHTS.map((h, i) => {
    const x = i * (BAR_W + GAP) + BAR_W / 2;
    const y = CHART_H - h;
    return [x, y] as const;
  });

  return (
    <div className="h-28 border-b border-stone/40 bg-oat px-4 pb-4 pt-4">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
        {BAR_HEIGHTS.map((h, i) => (
          <rect
            key={i}
            x={i * (BAR_W + GAP)}
            y={CHART_H - h}
            width={BAR_W}
            height={h}
            fill={SERIES_COLOR_ORDER[i % SERIES_COLOR_ORDER.length]}
          />
        ))}
        {trend && (
          <polyline
            points={points.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="var(--color-plum)"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}

// Real column names from RankTable, laid out as an actual grid — the
// point is to read as a table, not a chart. Year/Coach stay neutral
// skeleton bars (no figure implied); Index and Marks share one accent
// per row, Garnet -> Gold -> Sage -> Lavender, so the preview reads
// as coordinated conditional formatting rather than decoration.
// Garnet on row one doubles as the rank-1 index figure — one of
// Garnet's few scoped uses per DESIGN.md, never the shared
// chart-series order.
const TABLE_COLUMNS = ["Rank", "Year", "Coach", "Index", "Marks"];
const ROW_COLOR = [
  "var(--color-garnet)",
  "var(--color-gold)",
  "var(--color-sage)",
  "var(--color-lavender)",
];
const TABLE_ROWS = ROW_COLOR.length;

function TableThumbnail() {
  return (
    <div className="flex h-28 flex-col gap-2 border-b border-stone/40 bg-oat px-4 py-3.5 font-mono">
      <div className="grid grid-cols-5 gap-2 border-b border-stone/30 pb-1.5 text-[8px] tracking-label uppercase text-stone">
        {TABLE_COLUMNS.map((col) => (
          <span key={col}>{col}</span>
        ))}
      </div>
      {Array.from({ length: TABLE_ROWS }).map((_, i) => (
        <div key={i} className="grid grid-cols-5 items-center gap-2">
          <span className={`text-xs ${i === 0 ? "font-medium text-charcoal" : "text-stone"}`}>{i + 1}</span>
          <span className="h-1.5 rounded-sm bg-stone/25" />
          <span className="h-1.5 rounded-sm bg-stone/25" />
          <span className="h-1.5 rounded-sm" style={{ backgroundColor: ROW_COLOR[i] }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ROW_COLOR[i] }} />
        </div>
      ))}
    </div>
  );
}

// A decorative back-rank strip, not a real position — same glyphs, board
// tones, and light/dark contrast treatment (LIGHT_PIECE_CONTOUR /
// DARK_PIECE_HALO) as the real board in components/chess/ChessBoard.tsx,
// so the preview reads as "this is the chess app" rather than a chart.
// Alternates sides purely for visual rhythm across the strip.
const CHESS_STRIP = [
  { glyph: "♖", light: true },
  { glyph: "♞", light: false },
  { glyph: "♗", light: true },
  { glyph: "♛", light: false },
  { glyph: "♔", light: true },
  { glyph: "♝", light: false },
  { glyph: "♘", light: true },
  { glyph: "♜", light: false },
];

function ChessThumbnail() {
  return (
    <div className="flex h-28 border-b border-stone/40">
      {CHESS_STRIP.map((piece, i) => {
        const onLimestone = i % 2 === 0;
        return (
          <div
            key={i}
            className="flex flex-1 items-center justify-center"
            style={{ backgroundColor: onLimestone ? BOARD_TONES.limestone : BOARD_TONES.walnut }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2.5rem",
                lineHeight: 1,
                color: piece.light ? BOARD_TONES.lightPiece : BOARD_TONES.darkPiece,
                textShadow: piece.light ? LIGHT_PIECE_CONTOUR : onLimestone ? "none" : DARK_PIECE_HALO,
              }}
            >
              {piece.glyph}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Thumbnail({ project }: { project: ProjectMeta }) {
  if (project.status !== "live") {
    return (
      <div className="flex h-28 items-center justify-center border-b border-dashed border-stone/60 bg-stone/5">
        <span className="text-xs tracking-label uppercase text-stone">
          {project.status === "rebuild" ? "Rebuilding on real data" : "Coming soon"}
        </span>
      </div>
    );
  }
  if (project.preview === "table") return <TableThumbnail />;
  if (project.preview === "chess") return <ChessThumbnail />;
  return <BarsThumbnail trend={project.preview === "bars-trend"} />;
}

export function ProjectCard({ project }: { project: ProjectMeta }) {
  const href = `/${project.wing}/${project.slug}`;

  return (
    <div className="flex flex-col overflow-hidden rounded-sm border border-stone/40">
      <Thumbnail project={project} />
      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs tracking-label uppercase text-sage">{project.category}</span>
        <h3 className="mt-2 font-display text-lg font-light text-charcoal">{project.title}</h3>
        <p className="mt-2 flex-1 text-sm text-charcoal/80">{project.description}</p>
        {project.status === "live" ? (
          <Link
            href={href}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-plum hover:text-gold"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            Open dashboard
          </Link>
        ) : (
          <p className="mt-4 text-sm text-stone">
            {project.status === "rebuild" ? "In rebuild" : "Planned"}
          </p>
        )}
      </div>
    </div>
  );
}
