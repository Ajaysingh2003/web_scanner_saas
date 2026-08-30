"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { Project } from "@/modules/project/types";

const STORAGE_KEY = "aetherscan_active_project_id";

interface ProjectContextType {
  project: Project | undefined;
  projectId: string;
  projects: Project[];
  isLoading: boolean;
  setActiveProject: (id: string) => void;
  refetchProjects: () => Promise<any>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery(trpc.project.list.queryOptions());
  const projects = (projectsQuery.data as Project[]) || [];

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Initialize from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedId(stored);
      }
    }
  }, []);

  // When projects load or change, ensure we have a valid selection
  useEffect(() => {
    if (projects.length > 0) {
      if (!selectedId || !projects.some((p) => p.id === selectedId)) {
        const initialId = projects[0].id;
        setSelectedId(initialId);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, initialId);
        }
      }
    }
  }, [projects, selectedId]);

  const setActiveProject = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, id);
      }
      // Immediately invalidate all project-scoped queries to refetch data for the new project
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const activeProject = useMemo(() => {
    if (projects.length === 0) return undefined;
    return projects.find((p) => p.id === selectedId) || projects[0];
  }, [projects, selectedId]);

  const value = useMemo(
    () => ({
      project: activeProject,
      projectId: activeProject?.id || "00000000-0000-0000-0000-000000000000",
      projects,
      isLoading: projectsQuery.isLoading,
      setActiveProject,
      refetchProjects: () => projectsQuery.refetch(),
    }),
    [activeProject, projects, projectsQuery.isLoading, setActiveProject, projectsQuery.refetch],
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useActiveProject(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useActiveProject must be used within a ProjectProvider");
  }
  return context;
}
