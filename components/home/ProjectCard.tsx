import Link from "next/link";
import { ExternalLinkIcon } from "@/components/icons/ExternalLinkIcon";
import { SERIES_COLOR_ORDER } from "@/lib/chart-colors";
import type { ProjectMeta } from "@/lib/projects";

const THUMBNAIL_BAR_HEIGHTS = [40, 60, 30, 75, 50, 65, 45];

function Thumbnail({ status }: { status: ProjectMeta["status"] }) {
  if (status !== "live") {
    return (
      <div className="flex h-28 items-center justify-center border-b border-dashed border-stone/60 bg-stone/5">
        <span className="text-xs tracking-label uppercase text-stone">
          {status === "rebuild" ? "Rebuilding on real data" : "Coming soon"}
        </span>
      </div>
    );
  }
  return (
    <div className="flex h-28 items-end gap-1.5 border-b border-stone/40 bg-oat px-4 pb-4">
      {THUMBNAIL_BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{ height: `${h}%`, backgroundColor: SERIES_COLOR_ORDER[i % SERIES_COLOR_ORDER.length] }}
        />
      ))}
    </div>
  );
}

export function ProjectCard({ project }: { project: ProjectMeta }) {
  const href = `/${project.wing}/${project.slug}`;

  return (
    <div className="flex flex-col overflow-hidden rounded-sm border border-stone/40">
      <Thumbnail status={project.status} />
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
