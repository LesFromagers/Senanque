import { notFound } from "next/navigation";
import { getProject, projectsByWing } from "@/lib/projects";
import { PlaceholderProject } from "@/components/project/PlaceholderProject";

export function generateStaticParams() {
  return projectsByWing("agentics")
    .filter((project) => project.status !== "live")
    .map((project) => ({ slug: project.slug }));
}

export default async function AgenticsProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject("agentics", slug);
  if (!project || project.status === "live") notFound();

  return <PlaceholderProject project={project} />;
}
