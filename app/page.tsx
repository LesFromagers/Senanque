import { Hero } from "@/components/home/Hero";
import { WingSummary } from "@/components/home/WingSummary";
import { ProjectGrid } from "@/components/home/ProjectGrid";
import { projects } from "@/lib/projects";

export default function HomePage() {
  return (
    <>
      <Hero />
      <WingSummary />
      <ProjectGrid projects={projects} />
    </>
  );
}
