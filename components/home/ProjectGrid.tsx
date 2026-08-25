"use client";

import { useState } from "react";
import { ProjectCard } from "./ProjectCard";
import { PRACTICES } from "@/lib/practices";
import type { ProjectMeta } from "@/lib/projects";

const TABS = ["All", ...PRACTICES.map((p) => p.label)];

/**
 * Filter tabs are fixed to the five arcade practices (see lib/practices)
 * rather than derived from whatever's in the registry — a tab and a bay
 * always name the same five things, in the same order, even before a
 * project exists in every category yet. A tab with nothing in it shows
 * an honest empty state rather than hiding itself.
 */
export function ProjectGrid({ projects }: { projects: ProjectMeta[] }) {
  const [active, setActive] = useState<string>("All");
  const filtered = active === "All" ? projects : projects.filter((p) => p.category === active);

  return (
    <section id="work" className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-xs tracking-label uppercase text-stone">Selected work</h2>
        <div className="flex flex-wrap gap-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={
                active === tab
                  ? "text-sm font-medium text-charcoal underline decoration-gold decoration-2 underline-offset-4"
                  : "text-sm text-stone transition-colors hover:text-charcoal"
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="mt-10 font-display text-lg italic text-stone">Nothing published here yet.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}
