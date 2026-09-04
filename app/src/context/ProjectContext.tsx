"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { Project } from "@/modules/project/types";

const STORAGE_KEY = "scanlyst_active_project_id";

interface ProjectContextType {
  project: Project | undefined;
  projectId: string;
  projects: Project[];
  isLoading: boolean;
  setActiveProject: (id: string) => void;
  refetchProjects: () => Promise<unknown>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children, initialProjectId }: { children: React.ReactNode; initialProjectId?: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const projectsQuery = useSuspenseQuery(trpc.project.list.queryOptions());
  const { isLoading, refetch } = projectsQuery;
  const projects = useMemo(() => (projectsQuery.data as Project[]) || [], [projectsQuery.data]);

  const [selectedId, setSelectedId] = useState<string | null>(initialProjectId ?? null);

  // Keep the browser preference in sync with the server-readable selection.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && !initialProjectId) document.cookie = `${STORAGE_KEY}=${encodeURIComponent(stored)}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [initialProjectId]);

  // When projects load or change, ensure we have a valid selection
  useEffect(() => {
    if (projects.length > 0) {
      if (!selectedId || !projects.some((p) => p.id === selectedId)) {
        const initialId = projects[0].id;
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, initialId);
          document.cookie = `${STORAGE_KEY}=${encodeURIComponent(initialId)}; path=/; max-age=31536000; samesite=lax`;
        }
      }
    }
  }, [projects, selectedId]);

  const setActiveProject = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, id);
        document.cookie = `${STORAGE_KEY}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
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
      isLoading,
      setActiveProject,
      refetchProjects: () => refetch(),
    }),
    [activeProject, projects, isLoading, setActiveProject, refetch],
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
