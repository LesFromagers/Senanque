import { Arcade } from "@/components/brand/Arcade";
import type { ProjectMeta } from "@/lib/projects";

/** Minimal status template for a registry entry that isn't live yet. */
export function PlaceholderProject({ project }: { project: ProjectMeta }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <Arcade bays={3} size="marker" className="mb-10 max-w-xs" />
      <span className="text-xs tracking-label uppercase text-sage">{project.category}</span>
      <h1 className="mt-2 font-display text-3xl font-light text-charcoal">{project.title}</h1>
      <p className="mt-4 text-charcoal/90">{project.description}</p>
      <p className="mt-6 text-sm text-stone">
        Data source: {project.dataSource} · Status:{" "}
        {project.status === "rebuild" ? "In rebuild" : "Planned"}
      </p>
    </div>
  );
}
