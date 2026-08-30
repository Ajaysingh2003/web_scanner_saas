import { useMemo, useState, useRef, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  Globe2,
  LogOut,
  Plus,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { useActiveProject } from "@/hooks/useActiveProject";

export default function ProfileMenu() {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { open } = useSidebar();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const { data: user } = useQuery(trpc.user.profile.queryOptions());
  const { project: activeProject, projects, setActiveProject } = useActiveProject();

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  const logout = useMutation({
    mutationFn: () => trpcClient.user.logout.mutate(),
    onSuccess: async () => {
      await queryClient.clear();
      window.location.assign("/login");
    },
    onError: (error) => toast.error(error.message || "Could not sign out"),
  });

  const createProject = useMutation({
    mutationFn: (input: {
      name: string;
      website_url: string;
    }) => trpcClient.project.create.mutate(input),
    onSuccess: (newProject) => {
      toast.success("Project created");
      setCreateOpen(false);
      setName("");
      setWebsiteUrl("");
      setActiveProject(newProject.id);
    },
    onError: (error) =>
      toast.error(error.message || "Could not create project"),
  });

  const selectProject = (selectedId: string) => {
    setIsOpen(false);
    setActiveProject(selectedId);
  };

  // Helper to render favicon or fallback using Google favicon service
  const ProjectAvatar = ({
    project,
    size = "sm",
  }: {
    project?: any;
    size?: "sm" | "md";
  }) => {
    const [imgError, setImgError] = useState(false);
    const avatarSize = size === "sm" ? "size-7" : "size-8";
    const textSize = size === "sm" ? "text-xs" : "text-sm";

    // Build Google favicon URL from website_url
    const faviconUrl = project?.website_url
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
          project.website_url,
        )}&sz=32`
      : null;

    return (
      <>
        {faviconUrl && !imgError ? (
          <img
            src={faviconUrl}
            alt=""
            className={cn(
              avatarSize,
              "shrink-0 rounded-md object-contain bg-white",
            )}
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={cn(
              avatarSize,
              "shrink-0 flex items-center justify-center rounded-md bg-blue-600 text-white font-bold",
              textSize,
            )}
          >
            {project?.name?.slice(0, 1).toUpperCase() || "P"}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <div ref={dropdownRef} className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen((v) => !v);
            }}
            className="flex min-w-0 w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
          >
            <ProjectAvatar project={activeProject} size="sm" />
            {open && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {activeProject?.name || "Select a project"}
                </p>
                <p className="truncate text-[12px] text-slate-500">
                  {activeProject?.website_url || user?.email || ""}
                </p>

              </div>
            )}
            {open && (
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-slate-400 ml-auto transition-transform duration-200",
                  isOpen && "rotate-180 text-slate-600"
                )}
              />
            )}
          </button>

          {/* Floating dropdown menu */}
          {isOpen && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-full mt-1.5 z-50 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
            >
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Switch Project
              </div>
              <div className="my-1 h-px bg-slate-100" />
              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {projects.map((project) => (
                  <button
                    type="button"
                    key={project.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      selectProject(project.id || "");
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50 transition-colors",
                      activeProject?.id === project.id && "bg-slate-50"
                    )}
                  >
                    <ProjectAvatar project={project} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-slate-800">
                        {project.name}
                      </span>
                      <span className="block truncate text-[12px] text-slate-500">
                        {project.website_url}
                      </span>
                    </span>
                    {activeProject?.id === project.id && (
                      <Check className="mt-0.5 size-3.5 text-blue-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <div className="my-1 h-px bg-slate-100" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                  setCreateOpen(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-black hover:bg-blue-50 transition-colors"
              >
                <Plus className="size-3.5" />
                Create project
              </button>
            </div>
          )}
        </div>

        {open && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCreateOpen(true);
            }}
            title="Create project"
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>


        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Project name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              placeholder="Website URL"
              type="url"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                createProject.isPending || !name.trim() || !websiteUrl.trim()
              }
              onClick={() =>
                createProject.mutate({
                  name,
                  website_url: websiteUrl,
                })
              }
            >
              {createProject.isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
