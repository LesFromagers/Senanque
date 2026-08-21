"use client";

import { useMemo, useState } from "react";
import { ProjectCard } from "./ProjectCard";
import type { ProjectMeta } from "@/lib/projects";

/**
 * Category tabs derive from whatever's in the registry rather than a
 * hardcoded list — the grid never needs hand-editing as projects are
 * added, at the cost of a category only appearing once a project in it
 * exists.
 */
export function ProjectGrid({ projects }: { projects: ProjectMeta[] }) {
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(projects.map((p) => p.category)))],
    [projects],
  );
  const [active, setActive] = useState("All");
  const filtered = active === "All" ? projects : projects.filter((p) => p.category === active);

  return (
    <section id="work" className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-xs tracking-label uppercase text-stone">Selected work</h2>
        <div className="flex flex-wrap gap-4">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActive(category)}
              className={
                active === category
                  ? "text-sm font-medium text-charcoal underline decoration-gold decoration-2 underline-offset-4"
                  : "text-sm text-stone transition-colors hover:text-charcoal"
              }
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  );
}
