"use client"



import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Boxes,
  ChevronDown,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  SearchCheck,
  Search,
  Bot,
  Globe,
  Accessibility,
  Radio,
  Clock,
  Database,
  Webhook,
  SlidersHorizontal,
  Lock,
  FileCheck2,
  LucideIcon,
  CalendarClock,
  GitCompareArrows,
  Play,
  ListChecks,
  Sparkles,
  ChevronUp,
  LogOut,
  CreditCard,
  User,
  Rocket,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import ProfileMenu from "@/modules/user/component/ProfileMenu";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DialogPricing from "@/modules/billing/component/DialogPricing";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  children?: NavItem[];
};

const Scanitems = [
  { href: "/dashboard/scans", label: "Overview", icon: Activity, exact: true },
  { href: "/dashboard/scans/run", label: "Run new scan", icon: Play },
  { href: "/dashboard/scans/history", label: "History", icon: ListChecks },
  {
    href: "/dashboard/scans/schedules",
    label: "Schedules",
    icon: CalendarClock,
  },
  {
    href: "/dashboard/scans/compare",
    label: "Compare",
    icon: GitCompareArrows,
  },
];

const primaryNavigation: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Scans", href: "/dashboard/scans", icon: SearchCheck, children: Scanitems },
];

const auditNavigation: NavItem[] = [
  {
    label: "Security",
    href: "/dashboard/security",
    icon: ShieldCheck,
    children: [
      { label: "Overview", href: "/dashboard/security", icon: ShieldCheck, exact: true },
      { label: "Headers & TLS", href: "/dashboard/security/headers", icon: Lock },
      { label: "Application risks", href: "/dashboard/security/vulnerabilities", icon: SearchCheck },
    ],
  },
  { label: "SEO", href: "/dashboard/seo", icon: Search },
  { label: "AEO", href: "/dashboard/aeo", icon: Bot },
  { label: "Performance", href: "/dashboard/performance", icon: Gauge },
  { label: "Domain", href: "/dashboard/domain", icon: Globe },
  { label: "Compliance", href: "/dashboard/compliance", icon: FileCheck2 },
  { label: "Accessibility", href: "/dashboard/accessibility", icon: Accessibility },
];

const operateNavigation: NavItem[] = [
  { label: "Live threats", href: "/dashboard/threats", icon: Radio },
  {
    label: "Monitoring",
    href: "/dashboard/monitoring",
    icon: BarChart3,
    children: [
      { label: "Overview", href: "/dashboard/monitoring", icon: BarChart3, exact: true },
      { label: "Uptime", href: "/dashboard/uptime", icon: Gauge },
      { label: "Incidents", href: "/dashboard/monitoring/incidents", icon: Activity },
    ],
  },
  {
    label: "Connections",
    href: "/dashboard/connections",
    icon: Boxes,
    children: [
      { label: "All connections", href: "/dashboard/connections", icon: Boxes, exact: true },
      { label: "Supabase", href: "/dashboard/connections/supabase", icon: Database },
      { label: "Provider access", href: "/dashboard/connections/providers", icon: KeyRound },
    ],
  },
  { label: "History", href: "/dashboard/history", icon: Clock },
];

const insightNavigation: NavItem[] = [
  { label: "Benchmarks", href: "/dashboard/benchmarks", icon: BarChart3 },
  { label: "ROI", href: "/dashboard/roi", icon: Gauge },
];

const reportsNavigation: NavItem[] = [
  { label: "Reports & exports", href: "/dashboard/reports", icon: FileCheck2 },
];

const projectNavigation: NavItem[] = [
  {
    label: "API & MCP",
    href: "/dashboard/api-mcp",
    icon: KeyRound,
    children: [
      { label: "API keys", href: "/dashboard/api-mcp", icon: KeyRound, exact: true },
      { label: "Webhooks", href: "/dashboard/api-mcp/webhooks", icon: Webhook },
    ],
  },
  {
    label: "Project settings",
    href: "/dashboard/settings/project",
    icon: Settings,
    children: [
      { label: "Project URLs", href: "/dashboard/settings/project", icon: Settings, exact: true },
      { label: "Scan settings", href: "/dashboard/settings/project/scans", icon: SlidersHorizontal },
    ],
  },
  // { label: "Account", href: "/dashboard/settings/account", icon: Settings },
];

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href || pathname === `${item.href}/`;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

// ----------------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------------

function NavigationGroup({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname();
  const { open } = useSidebar();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    items.forEach((item) => {
      if (item.children?.some((child) => isItemActive(pathname, child))) {
        setExpanded((prev) => ({ ...prev, [item.href]: true }));
      }
    });
  }, [pathname, items]);

  const toggleExpand = (href: string) => {
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  return (
    <SidebarGroup className="py-1.5">
      <SidebarGroupLabel
        className={cn(
          "px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70",
          !open && "sr-only"
        )}
      >
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname, item);
            const hasActiveChild = item.children?.some((child) =>
              isItemActive(pathname, child)
            );
            const isExpanded = expanded[item.href] ?? hasActiveChild;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={active && !item.children}
                  tooltip={item.label}
                  onClick={item.children ? () => toggleExpand(item.href) : undefined}
                  className={cn(
                    "relative flex h-8.5 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-150",
                    "text-muted-foreground hover:bg-accentz hover:text-stone-700 [&:hover_svg]:text-foreground",
                    (active || hasActiveChild) &&
                      "bg-rose-50/70 font-semibold text-foreground"
                  )}
                  render={
                    item.children ? (
                      <button type="button" aria-expanded={isExpanded} />
                    ) : (
                      <Link href={item.href} />
                    )
                  }
                >
                  {/* Subtle active indicator bar */}
                  {(active || hasActiveChild) && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-[#f43f5e]" />
                  )}

                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      active || hasActiveChild
                        ? "text-[#f43f5e]"
                        : "text-muted-foreground/70"
                    )}
                  />
                  
                  <span className="truncate">{item.label}</span>

                  {item.children && open && (
                    <ChevronDown
                      className={cn(
                        "ml-auto size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  )}
                </SidebarMenuButton>

                {/* Sub-menu rendering */}
                {item.children && open && isExpanded && (
                  <SidebarMenuSub className="ml-3.5 border-l border-border/60 pl-2.5 my-0.5 space-y-0.5">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = isItemActive(pathname, child);

                      return (
                        <SidebarMenuSubItem key={child.href}>
                          <SidebarMenuSubButton
                            isActive={childActive}
                            className={cn(
                              "h-7 text-xs font-medium text-muted-foreground transition-colors rounded-sm px-2",
                              "hover:bg-accent/2 hover:text-foreground [&:hover_svg]:opacity-100",
                              childActive &&
                                "bg-primary/10 font-semibold text-primary hover:bg-primary/10 hover:text-primary"
                            )}
                            render={<Link href={child.href} />}
                          >
                            <ChildIcon className="size-3.5 shrink-0 opacity-80 transition-opacity" />
                            <span className="truncate">{child.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
function SidebarUpgradeCard() {
  const { open } = useSidebar();
  const trpc = useTRPC();
  const client = useTRPCClient();
  const billing = useQuery({
    ...trpc.project.billingAccount.queryOptions(),
    refetchInterval: 15_000,
  });
  const checkout = useMutation({
    mutationFn: (plan: "starter" | "pro" | "max") =>
      client.project.createCheckout.mutate({ plan, interval: "monthly" }),
    onSuccess: ({ checkout_url }) => window.location.assign(checkout_url),
    onError: (error) => toast.error(error.message || "Could not open checkout"),
  });
  const portal = useMutation({
    mutationFn: () => client.project.createBillingPortal.mutate(),
    onSuccess: ({ portal_url }) => window.location.assign(portal_url),
    onError: (error) => toast.error(error.message || "Could not open billing"),
  });

  const account = billing.data;
  const plan = account?.plan ?? "free";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const scansUsed = account?.usage_scans ?? 0;
  const scanLimit = account?.usage_limit ?? null;
  const usagePercent = scanLimit ? Math.min(100, Math.round((scansUsed / scanLimit) * 100)) : 0;
  const nextPlan = plan === "free" ? "starter" : plan === "starter" ? "pro" : plan === "pro" ? "max" : null;
  const nextPlanLabel = nextPlan ? nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1) : null;


  const [isOpen, setIsOpen] = useState(false);
  return (
    <div
      className={cn(
        "rounded-2xl border relative  border-slate-200 bgz-white p-3 shadow-sm transition-all duration-200",
        !open && "flex flex-col items-center gap-2 p-2"
      )}
    >
      <div className="flex top-0 bg-red-300 absolute items-center justify-between gap-2 ">

      <DialogPricing open={isOpen} onClose={() => setIsOpen(false)} />
      </div>
      <div className={cn("flex items-center gap-3", !open && "flex-col")}>
        <div
  className={cn(
    "flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600",
    !open && "h-9 w-9"
  )}
>
  <Rocket className="h-4 w-4" />
</div>
        {open && (
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-800">{planLabel} plan</p>
              <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-stone-900">
                {plan}
              </span>
            </div>
            <p className="text-[11px]  text-slate-500">
              {nextPlanLabel
                ? `Upgrade to ${nextPlanLabel} for more capacity`
                : "All features are unlocked"}
            </p>
          </div>
        )}
      </div>

      {open && (
        <>
        
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Scan usage</span>
              <span className="font-medium text-slate-700">
                {scanLimit === null ? `${scansUsed} used` : `${scansUsed} / ${scanLimit}`}
              </span>
            </div>
            {scanLimit !== null ? (
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    usagePercent >= 100 ? "bg-rose-500" : "bg-red-300"
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            ) : (
              <div className="h-1.5 w-full rounded-full bg-slate-100" />
            )}
            {scanLimit !== null && usagePercent >= 100 && (
              <p className="pt-0.5 text-[10px] font-medium text-rose-600">
                Monthly scan limit reached
              </p>
            )}
          </div>
          <div className="mt-3 space-y-1.5">
            {nextPlan && (
              <Button
                size="sm"
                className="w-full bg-background-btn text-xs text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 disabled:opacity-50"
                disabled={checkout.isPending}
                onClick={() => setIsOpen(true)}
              >
                {checkout.isPending ? "Opening checkout…" : `Upgrade to ${nextPlanLabel}`}
              </Button>
            )}
            {account?.dodo_customer_configured && (
              <Button
                size="sm"
                variant="outline"
                className="w-full border-slate-200 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                disabled={portal.isPending}
                onClick={() => portal.mutate()}
              >
                {portal.isPending ? "Opening billing…" : "Manage billing"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function SidebarUserFooter() {
  const { open } = useSidebar();
  const trpc = useTRPC();
  const client = useTRPCClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const profile = useQuery(trpc.user.profile.queryOptions());
  const logout = useMutation({
    mutationFn: () => client.user.logout.mutate(),
    onSuccess: async () => {
      await queryClient.clear();
      window.location.assign("/login");
    },
    onError: (error) => toast.error(error.message || "Could not sign out"),
  });


  const email = profile.data?.email || "";
  const name = profile.data?.display_name?.trim() || email.split("@")[0] || "Account";
  const initials =
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Floating dropdown menu positioned above the trigger */}
      {isOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full left-0 mb-2 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Account
          </div>
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigate("/dashboard/settings/account");
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <User className="size-4 text-slate-400" /> Profile settings
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigate("/pricing");
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <CreditCard className="size-4 text-slate-400" /> Billing
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigate("/dashboard/settings/project");
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Settings className="size-4 text-slate-400" /> Project settings
          </button>
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            disabled={logout.isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
              logout.mutate();
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
          >
            <LogOut className="size-4 text-rose-400" />
            {logout.isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-slate-100/80 active:bg-slate-200/60 cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-slate-300",
          !open && "justify-center"
        )}
      >
        <Avatar className="h-8 w-8 shrink-0 border border-slate-200">
          <AvatarImage alt={name} />
          <AvatarFallback className="bg-rose-50 text-xs font-semibold text-rose-600">
            {initials}
          </AvatarFallback>
        </Avatar>
        {open && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{name}</p>
            <p className="truncate text-xs text-slate-400">{email}</p>
          </div>
        )}
        {open && (
          <ChevronUp
            className={cn(
              "size-4 shrink-0 text-slate-300 ml-auto transition-transform duration-200",
              isOpen && "rotate-180 text-slate-500"
            )}
          />
        )}
      </button>
    </div>
  );
}


export function AppSidebar() {

  return (
    <Sidebar collapsible="icon" className="border-r border-black/5 bg-black-100">
      {/* Sidebar Header */}
      <SidebarHeader className="border-b border-black/5 p-2">
        <ProfileMenu />
      </SidebarHeader>

      {/* Sidebar Navigation */}
      <SidebarContent className="custom-scrollbar  flex-1 overflow-y-auto px-1 py-1">
        <NavigationGroup label="Overview" items={primaryNavigation} />
        <NavigationGroup label="Audit"    items={auditNavigation} />
        <NavigationGroup label="Operate"  items={operateNavigation} />
        <NavigationGroup label="Insights" items={insightNavigation} />
        <NavigationGroup label="Reports"  items={reportsNavigation} />
        <NavigationGroup label="Project"  items={projectNavigation} />
      </SidebarContent>

      <SidebarFooter className="border-t border-black/5 p-3">
        <div className="space-y-3">
          <SidebarUpgradeCard />
          <SidebarUserFooter />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
