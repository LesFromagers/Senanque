import { notFound } from "next/navigation";
import { getProject, projectsByWing } from "@/lib/projects";
import { PlaceholderProject } from "@/components/project/PlaceholderProject";

export function generateStaticParams() {
  return projectsByWing("analytics")
    .filter((project) => project.status !== "live")
    .map((project) => ({ slug: project.slug }));
}

export default async function AnalyticsProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject("analytics", slug);
  // Live projects (e.g. bailey-bros) are served by their own literal route
  // folder, which Next.js resolves ahead of this dynamic segment — landing
  // here for a "live" slug means the registry and the routes have drifted.
  if (!project || project.status === "live") notFound();

  return <PlaceholderProject project={project} />;
}
