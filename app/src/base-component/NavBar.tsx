"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { AuthUser } from "@/modules/user/types";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Shield,
  Search,
  Gauge,
  Accessibility,
  Building2,
  Rocket,
  ShoppingCart,
  Building,
  ChevronDown,
  ChevronRight,
  Activity,
  Share2,
  Code2,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MenuItem = {
  icon: React.ElementType;
  title: string;
  desc: string;
  href: string;
};

type MenuColumn = {
  label: string;
  items: MenuItem[];
};

const productColumns: MenuColumn[] = [
  {
    label: "Audits",
    items: [
      {
        icon: Shield,
        title: "Security Audit",
        desc: "SQLi, XSS, auth flow & more",
        href: "/scans/sqli",
      },
      {
        icon: Search,
        title: "SEO & AEO Audit",
        desc: "Structured data, meta tags, AI-readiness",
        href: "/scans/technical-seo",
      },
      {
        icon: Gauge,
        title: "Performance Audit",
        desc: "Core Web Vitals & load speed",
        href: "/scans/core-web-vitals",
      },
      {
        icon: Accessibility,
        title: "Accessibility Audit",
        desc: "WCAG 2.1 compliance checks",
        href: "/scans/accessibility-wcag",
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        icon: Activity,
        title: "Uptime Monitoring",
        desc: "Real-time downtime alerts",
        href: "/scans/uptime-heartbeat",
      },
      {
        icon: Share2,
        title: "Shareable Reports",
        desc: "Client-ready, exportable audits",
        href: "/#how-it-works",
      },
      {
        icon: Code2,
        title: "API Access",
        desc: "Run scans programmatically",
        href: "/#integrations",
      },
      {
        icon: RefreshCw,
        title: "Scheduled Rescans",
        desc: "Automatic recurring checks",
        href: "/scans/retest-verification",
      },
    ],
  },
];

const solutionsColumns: MenuColumn[] = [
  {
    label: "Audit Suites",
    items: [
      {
        icon: Shield,
        title: "Security Audits",
        desc: "SQLi, XSS, headers & auth protection",
        href: "/solutions/security",
      },
      {
        icon: Search,
        title: "SEO & AEO",
        desc: "Search engine & AI crawler readiness",
        href: "/solutions/seo-aeo",
      },
      {
        icon: Gauge,
        title: "Performance",
        desc: "Core Web Vitals & speed benchmarks",
        href: "/solutions/performance",
      },
      {
        icon: Accessibility,
        title: "Accessibility",
        desc: "WCAG 2.1 AA/AAA compliance checks",
        href: "/solutions/accessibility",
      },
    ],
  },
];

const plainLinks = [
  { href: "/scans", label: "Scans" },
  { href: "/pricing", label: "Pricing" },
];

const triggerClass =
  "relative px-3 py-1.5 text-[13px] font-medium text-neutral-700 hover:text-neutral-900 rounded-md transition-all duration-200 hover:bg-neutral-200/50 bg-transparent data-[state=open]:bg-neutral-200/50 data-[state=open]:text-neutral-900 h-auto";

// hides the scrollbar visually while the element stays scrollable
const scrollbarHideClass =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

/* ---------- Desktop mega-menu pieces ---------- */

function MenuColumnBlock({ column }: { column: MenuColumn }) {
  return (
    <div className="flex-1 min-w-[220px]">
      <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
        {column.label}
      </p>
      <ul className="space-y-0.5">
        {column.items.map((item) => (
          <li key={`${column.label}-${item.title}`}>
            <Link
              href={item.href}
              className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-neutral-100/80 transition-colors duration-150"
            >
              <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-md bg-neutral-100 border border-neutral-200/70 text-neutral-700">
                <item.icon className="w-4 h-4" strokeWidth={1.75} />
              </span>
              <span className="flex flex-col">
                <span className="text-[13px] font-medium text-neutral-900">
                  {item.title}
                </span>
                <span className="text-[12px] text-neutral-500 leading-snug">
                  {item.desc}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MegaPanel({
  columns,
  footerHref,
  footerLabel,
}: {
  columns: MenuColumn[];
  footerHref?: string;
  footerLabel?: string;
}) {
  return (
    <div className="w-[92vw] max-w-[640px] sm:w-[640px] p-3">
      <div className="flex gap-2">
        {columns.map((col) => (
          <MenuColumnBlock key={col.label} column={col} />
        ))}
      </div>
      {footerHref && footerLabel && (
        <div className="mt-2 pt-2.5 border-t border-neutral-200/60">
          <Link
            href={footerHref}
            className="flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100/80 transition-colors duration-150"
          >
            {footerLabel}
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          </Link>
        </div>
      )}
    </div>
  );
}

// small "live scan" motion graphic — replaces the old promo copy
function ScanVisualPanel() {
  const checks = [
    { label: "Security scan complete", delay: "0ms" },
    { label: "SEO scan complete", delay: "180ms" },
    { label: "Performance scan complete", delay: "360ms" },
  ];

  return (
    <div className="w-full sm:w-[220px] rounded-lg bg-neutral-50 border border-neutral-200/70 p-4 flex flex-col items-center justify-center">
      {/* radar pulse */}
      <div className="relative w-14 h-14 flex items-center justify-center mb-4">
        <span className="absolute inset-0 rounded-full border border-background-btn/30 animate-ping [animation-duration:2.4s]" />
        <span
          className="absolute inset-1.5 rounded-full border border-background-btn/40 animate-ping [animation-duration:2.4s]"
          style={{ animationDelay: "0.6s" }}
        />
        <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-background-btn/10 text-background-btn">
          <ShieldCheck className="w-4 h-4" strokeWidth={2} />
        </span>
      </div>

      {/* staggered checklist */}
      <div className="w-full space-y-1.5">
        {checks.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-2 text-[11.5px] text-neutral-500 animate-in fade-in slide-in-from-left-1"
            style={{
              animationDelay: c.delay,
              animationDuration: "500ms",
              animationFillMode: "backwards",
            }}
          >
            <CheckCircle2 className="w-3 h-3 text-background-btn shrink-0" />
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Mobile accordion pieces ---------- */

function MobileMenuColumn({
  column,
  onNavigate,
}: {
  column: MenuColumn;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="px-3 pb-1 text-[10.5px] font-semibold tracking-wide text-neutral-400 uppercase">
        {column.label}
      </p>
      <div className="space-y-0.5">
        {column.items.map((item) => (
          <Link
            key={`${column.label}-${item.title}`}
            href={item.href}
            onClick={onNavigate}
            className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-neutral-200/40 transition-all duration-200"
          >
            <item.icon
              className="w-4 h-4 mt-0.5 text-neutral-500 shrink-0"
              strokeWidth={1.75}
            />
            <span className="flex flex-col">
              <span className="text-[13px] font-medium text-neutral-800">
                {item.title}
              </span>
              <span className="text-[12px] text-neutral-500">
                {item.desc}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobileAccordionSection({
  label,
  sectionKey,
  columns,
  isOpen,
  onToggle,
  onNavigate,
}: {
  label: string;
  sectionKey: string;
  columns: MenuColumn[];
  isOpen: boolean;
  onToggle: (key: string) => void;
  onNavigate: () => void;
}) {
  return (
    <div>
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-[14px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40 rounded-lg transition-all duration-200"
      >
        {label}
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-neutral-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="pl-2 pb-2 pt-1 animate-in slide-in-from-top-1 duration-150">
          {columns.map((col) => (
            <MobileMenuColumn
              key={col.label}
              column={col}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Navbar ---------- */

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const router = useRouter();
  const handleSubmit = () => {
    router.push("/login");
  };
  const trpc = useTRPC();
  const { data } = useQuery(trpc.user.profile.queryOptions());

  const user = data as AuthUser | null | undefined;

  const toggleMobileSection = (key: string) =>
    setMobileSection((prev) => (prev === key ? null : key));

  const closeMobileMenu = () => {
    setIsOpen(false);
    setMobileSection(null);
  };

  return (
    <header className="fixed top-4 left-0 right-0 z-50 px-4">
      <nav
        className="max-w-3xl mx-auto pl-3 pr-2 py-2 bg-[#f9f9f9]/90 backdrop-blur-sm 
        rounded-lg shadow-[0_1px_1px_0_rgba(38,38,43,0.10),0_0_0_1px_rgba(38,38,43,0.04),0_2px_12px_-4px_rgba(38,38,43,0.16)]
        transition-all duration-300 hover:shadow-[0_1px_1px_0_#26262B1A,0_0_0_1px_#26262B0F,0_4px_8px_-6px_#26262B2E]"
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative rounded-md overflow-hidden w-8 h-8 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="Scanlyst logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-base italic font-heading font-bold text-neutral-900 tracking-tight">
              Scanlyst
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center">
            <NavigationMenu >
              <NavigationMenuList className="gap-1">
                <NavigationMenuItem>
                  <NavigationMenuTrigger className={triggerClass}>
                    Products
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-[#f9f9f9]/95 backdrop-blur-sm rounded-lg shadow-[0_1px_1px_0_rgba(38,38,43,0.10),0_0_0_1px_rgba(38,38,43,0.04),0_8px_24px_-6px_rgba(38,38,43,0.20)] border-0">
                    <MegaPanel
                      columns={productColumns}
                      footerHref="/scans"
                      footerLabel="See all 41 scans"
                    />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className={triggerClass}>
                    Solutions
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-[#f9f9f9]/95 backdrop-blur-sm rounded-lg shadow-[0_1px_1px_0_rgba(38,38,43,0.10),0_0_0_1px_rgba(38,38,43,0.04),0_8px_24px_-6px_rgba(38,38,43,0.20)] border-0">
                    <div className="w-[92vw] max-w-[640px] sm:w-[640px] p-3 flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <MenuColumnBlock column={solutionsColumns[0]} />
                        <div className="mt-2 pt-2.5 border-t border-neutral-200/60">
                          <Link
                            href="/solutions"
                            className="flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100/80 transition-colors duration-150"
                          >
                            <span>Explore all 4 solutions</span>
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                          </Link>
                        </div>
                      </div>
                      <ScanVisualPanel />
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {plainLinks.map((link) => (
                  <NavigationMenuItem key={link.href}>
                    <Link href={link.href} className={triggerClass}>
                      {link.label}
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-1.5">
            {!user && (
              <Button
                onClick={handleSubmit}
                variant="ghost"
                className="text-[13px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50 transition-all duration-200 cursor-pointer h-8 px-3"
              >
                Sign in
              </Button>
            )}
            {!user ? (
              <Button
                onClick={handleSubmit}
                className="text-[13px] bg-background-btn"
              >
                Get Started
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/dashboard")}
                className={"text-[13px] bg-background-btn"}
              >
                Dashboard
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-200/50 transition-all duration-200"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div
            className={cn(
              "md:hidden pt-3 pb-2 mt-2 border-t border-neutral-200/60 space-y-0.5 animate-in slide-in-from-top-2 duration-200 max-h-[75vh] overflow-y-auto",
              scrollbarHideClass
            )}
          >
            <MobileAccordionSection
              label="Scans"
              sectionKey="scans"
              columns={productColumns}
              isOpen={mobileSection === "scans"}
              onToggle={toggleMobileSection}
              onNavigate={closeMobileMenu}
            />

            <MobileAccordionSection
              label="Solutions"
              sectionKey="solutions"
              columns={solutionsColumns}
              isOpen={mobileSection === "solutions"}
              onToggle={toggleMobileSection}
              onNavigate={closeMobileMenu}
            />

            {mobileSection === "solutions" && (
              <div className="px-3 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    if (user) {
                      router.push("/dashboard/scans/run");
                    } else {
                      router.push("/login");
                    }
                  }}
                  className="w-full flex items-center justify-between rounded-lg bg-neutral-50 border border-neutral-200/70 px-3 py-2.5 cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck
                      className="w-4 h-4 text-background-btn"
                      strokeWidth={1.75}
                    />
                    <span className="text-[13px] font-medium text-neutral-900">
                      Run a free scan
                    </span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              </div>
            )}

            {plainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="flex items-center justify-between px-3 py-2.5 text-[14px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40 rounded-lg transition-all duration-200"
              >
                {link.label}
                <svg
                  className="w-3.5 h-3.5 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}

            <div className="pt-2 mt-1 border-t border-neutral-200/60 space-y-1.5">
              {!user ? (
                <div>
                  <Button
                    onClick={handleSubmit}
                    variant="ghost"
                    className="w-full text-[14px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40 transition-all duration-200 cursor-pointer h-9 justify-start px-3"
                  >
                    Sign in
                  </Button>
                  <button
                    onClick={handleSubmit}
                    className="w-full bg-background-btn text-[13px] font-semibold rounded-lg text-white transition-all duration-200 cursor-pointer h-9"
                  >
                    Get Started
                  </button>
                </div>
              ) : (
                <Button
                  onClick={() => router.push("/dashboard")}
                  className={"w-full text-[13px] bg-background-btn"}
                >
                  Dashboard
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
