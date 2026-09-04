"use client";

import Link from "next/link";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { Bot, Search, CheckCircle2, XCircle, FileCode2, Layers, Copy } from "lucide-react";
import toast from "react-hot-toast";

import { useTRPC } from "@/trpc/client";
import { useActiveProject } from "@/hooks/useActiveProject";
import PageHeader from "@/modules/dashboard/component/PageHeader";
import FindingsTable from "@/modules/dashboard/component/FindingsTable";
import EmptyState from "@/modules/dashboard/component/EmptyState";
import LoadingSkeleton from "@/modules/dashboard/component/LoadingSkeleton";
import { Button } from "@/components/ui/button";

export default function AeoView() {
  const trpc = useTRPC();
  const { project, projectId, isLoading } = useActiveProject();

  const overview = useSuspenseQuery({
    ...trpc.project.overview.queryOptions({ project_id: projectId }),
  });

  const latestScan = useQuery({
    ...trpc.project.latestScan.queryOptions({ project_id: projectId }),
    enabled: !!project,
  });

  if (isLoading || overview.isLoading || latestScan.isLoading) {
    return <LoadingSkeleton />;
  }

  if (!project) {
    return (
      <EmptyState
        icon={Bot}
        title="No project selected"
        description="Select or create a project to view answer engine optimization findings."
        actionLabel="Open project settings"
        actionHref="/dashboard/settings/project"
      />
    );
  }

  const aeoFindings =
    latestScan.data?.findings?.filter((f: any) => f.category === "aeo") || [];

  const robotBlocks = aeoFindings.some((f) =>
    f.title.toLowerCase().includes("ai crawler") || f.title.toLowerCase().includes("robots"),
  );
  const missingLlms = aeoFindings.some((f) => f.title.toLowerCase().includes("llms.txt"));
  const structuredDataMissing = aeoFindings.some(
    (f) =>
      f.title.toLowerCase().includes("structured data is missing") ||
      f.title.toLowerCase().includes("schema"),
  );
  const faqMissing = aeoFindings.some(
    (f) => f.title.toLowerCase().includes("faq") || f.title.toLowerCase().includes("q&a"),
  );

  const aiBots = [
    { name: "GPTBot", provider: "OpenAI / ChatGPT search", allowed: !robotBlocks, desc: "Used for indexing web pages into ChatGPT search" },
    { name: "ClaudeBot", provider: "Anthropic / Claude", allowed: !robotBlocks, desc: "Web search and citations across Claude models" },
    { name: "PerplexityBot", provider: "Perplexity AI", allowed: !robotBlocks, desc: "Real-time web verification and conversational citation" },
    { name: "Google-Extended", provider: "Google Gemini", allowed: !robotBlocks, desc: "Gemini AI Overviews and grounding search" },
    { name: "Applebot-Extended", provider: "Apple Intelligence", allowed: !robotBlocks, desc: "Siri and Apple Intelligence web search" },
    { name: "Meta-ExternalAgent", provider: "Meta AI", allowed: !robotBlocks, desc: "Llama and Meta AI assistant web grounding" },
  ];

  const siteHostname = project.website_url ? new URL(project.website_url).hostname : "example.com";

  const copyLlmsPrompt = () => {
    const sample = `# ${project.name}\n\n> Official web application: https://${siteHostname}\n\n## Overview\n${project.name} is a high-performance web platform built with secure infrastructure.\n\n## Key documentation\n- https://${siteHostname}/`;
    navigator.clipboard.writeText(sample);
    toast.success("Sample llms.txt copied");
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        websiteUrl={project.website_url}
        title="Answer engine optimization"
        description="Check whether AI assistants (ChatGPT search, Perplexity, Claude, Google AI Overviews) can index, parse, and cite your site."
        score={overview.data?.category_scores?.aeo ?? null}
        scoreLabel="AEO score"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/seo">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-slate-200 text-xs text-slate-600">
                <Search className="size-3.5 text-slate-400" />
                SEO audit
              </Button>
            </Link>
            <Link href="/dashboard/scans/run">
              <Button size="sm" className="bg-background-btn h-9 px-4 text-xs font-medium text-white hover:brightness-95">
                Re-run AEO audit
              </Button>
            </Link>
          </div>
        }
      />

      {/* AI crawler access */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">AI crawler access</h2>
          <span className="text-xs text-slate-400">Status via robots.txt</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {aiBots.map((bot) => (
            <div key={bot.name} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-slate-50 text-xs font-semibold text-slate-500">
                    AI
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">{bot.name}</h3>
                    <p className="text-[11px] text-slate-400">{bot.provider}</p>
                  </div>
                </div>
                {bot.allowed ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <CheckCircle2 className="size-3" /> Allowed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    <XCircle className="size-3" /> Blocked
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-slate-500">{bot.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* llms.txt & structured data */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <FileCode2 className="size-4" />
              </span>
              <div>
                <h3 className="font-heading text-xs font-semibold text-slate-900">
                  /llms.txt
                </h3>
                <p className="text-[11px] text-slate-400">Standardized LLM context file</p>
              </div>
            </div>
            {missingLlms ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                Missing
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                Published
              </span>
            )}
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Publishing a curated <code>/llms.txt</code> file at your domain root lets AI agents
            read your documentation and core context directly, without scraping raw HTML.
          </p>

          <div className="group relative rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-1.5 text-[11px] text-slate-400">
              <span>https://{siteHostname}/llms.txt</span>
              <button
                type="button"
                onClick={copyLlmsPrompt}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-600"
              >
                <Copy className="size-3" /> Copy template
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre text-slate-600">
{`# ${project.name}
> https://${siteHostname}

## Key features
- High-performance web application
- Automated AI search visibility`}
            </pre>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
              <Layers className="size-4" />
            </span>
            <div>
              <h3 className="font-heading text-xs font-semibold text-slate-900">
                Structured data coverage
              </h3>
              <p className="text-[11px] text-slate-400">Entities that help AI disambiguation</p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs">
              <span className="font-medium text-slate-700">Organization & brand entity</span>
              {!structuredDataMissing ? (
                <span className="text-[11px] font-medium text-emerald-600">Detected</span>
              ) : (
                <span className="text-[11px] font-medium text-amber-600">Recommended</span>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs">
              <span className="font-medium text-slate-700">SoftwareApplication / product schema</span>
              <span className="text-[11px] text-slate-500">Active</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs">
              <span className="font-medium text-slate-700">FAQPage / Q&A direct answers</span>
              {!faqMissing ? (
                <span className="text-[11px] font-medium text-emerald-600">Detected</span>
              ) : (
                <span className="text-[11px] text-slate-400">Optional</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Findings */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Findings</h2>
          <span className="text-xs text-slate-400">
            {aeoFindings.length} issue{aeoFindings.length !== 1 ? "s" : ""}
          </span>
        </div>
        <FindingsTable
          findings={aeoFindings}
          scanId={latestScan.data?.id || overview.data?.latest_scan?.id}
          emptyMessage="No AEO issues found. Your site is ready for conversational search and citations."
          lockedCount={overview.data?.locked_findings}
        />
      </section>
    </main>
  );
}
