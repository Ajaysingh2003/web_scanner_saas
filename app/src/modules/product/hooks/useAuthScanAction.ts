"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useTRPC, useTRPCClient } from "@/trpc/client";
import { AuthUser } from "@/modules/user/types";
import { Project } from "@/modules/project/types";
import { getProjectTitleFromUrl, normalizeWebsiteUrl } from "@/lib/url-utils";

const STORAGE_KEY = "scanlyst_active_project_id";

function selectActiveProject(id: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, id);
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
  }
}

export function useAuthScanAction() {
  const router = useRouter();
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    ...trpc.user.profile.queryOptions(),
    retry: false,
  });

  const isAuthenticated = Boolean(user && (user as AuthUser).id);

  const { data: projects } = useQuery({
    ...trpc.project.list.queryOptions(),
    enabled: isAuthenticated,
    retry: false,
  });

  const createProjectMutation = useMutation({
    mutationFn: (input: { name: string; website_url: string }) =>
      trpcClient.project.create.mutate(input),
    onSuccess: (newProject) => {
      if (newProject.id) {
        selectActiveProject(newProject.id);
      }
      queryClient.invalidateQueries();
      toast.success("Project created");
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "Could not create project");
    },
  });

  const handleScanClick = (targetUrl?: string) => {
    if (!isAuthenticated) {
      if (targetUrl && targetUrl.trim()) {
        const clean = targetUrl.trim().replace(/^https?:\/\//, "");
        router.push(`/login?next=%2Fdashboard&target=${encodeURIComponent(clean)}`);
      } else {
        router.push("/login");
      }
      return;
    }

    if (!targetUrl || !targetUrl.trim()) {
      router.push("/dashboard");
      return;
    }

    const normalizedUrl = normalizeWebsiteUrl(targetUrl);
    const title = getProjectTitleFromUrl(normalizedUrl);

    // Normalize for comparison (ignoring trailing slash and protocol)
    const cleanTargetHost = normalizedUrl
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    const existingProject = (projects as Project[] | undefined)?.find((p) => {
      const pHost = p.website_url
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "")
        .toLowerCase();
      return pHost === cleanTargetHost;
    });

    if (existingProject) {
      selectActiveProject(existingProject.id);
      queryClient.invalidateQueries();
      toast.success(`Opened project: ${existingProject.name}`);
      router.push("/dashboard");
      return;
    }

    // Otherwise, create project right away
    createProjectMutation.mutate({
      name: title,
      website_url: normalizedUrl,
    });
  };

  return {
    user: user as AuthUser | null | undefined,
    isAuthenticated,
    handleScanClick,
    isCreating: createProjectMutation.isPending,
  };
}
