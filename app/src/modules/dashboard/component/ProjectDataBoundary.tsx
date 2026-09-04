"use client";

import { useActiveProject } from "@/hooks/useActiveProject";
import { EmptyProjectState } from "./EmptyProjectState";

export default function ProjectDataBoundary({ children }: { children: React.ReactNode }) {
  const { project } = useActiveProject();

  if (!project) {
    return (
      <div className="flex min-h-[calc(100svh-5rem)] w-full items-center justify-center px-6 py-10">
        <EmptyProjectState />
      </div>
    );
  }

  return children;
}
