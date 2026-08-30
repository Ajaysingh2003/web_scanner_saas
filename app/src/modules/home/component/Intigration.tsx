"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ShieldCheck } from "lucide-react";
import {
  SiVercel,
  SiCloudflare,
  SiGithub,
  SiSupabase,
//   SiSlack,
  SiDiscord,
  SiGitlab,
  SiNetlify,
  SiSlackware,
  SiFirebase,
} from "react-icons/si";

import {Workflow} from "lucide-react"

gsap.registerPlugin(useGSAP);

interface Node {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  x: number;
  y: number;
}

// viewBox is 1200 x 420, hub sits at (600, 210)
const HUB = { x: 600, y: 210, r: 44 };

const LEFT_NODES: Node[] = [
  { id: "vercel", name: "Vercel", icon: SiVercel, color: "#000000", x: 90, y: 130 },
  { id: "cloudflare", name: "Cloudflare", icon: SiCloudflare, color: "#F38020", x: 250, y: 130 },
  { id: "github", name: "GitHub", icon: SiGithub, color: "#181717", x: 130, y: 300 },
  { id: "supabase", name: "Supabase", icon: SiSupabase, color: "#3ECF8E", x: 290, y: 300 },
];

const RIGHT_NODES: Node[] = [
  { id: "slack", name: "Firebase", icon: SiFirebase, color: "#4A154B", x: 950, y: 130 },
  { id: "discord", name: "Discord", icon: SiDiscord, color: "#5865F2", x: 1110, y: 130 },
  { id: "gitlab", name: "GitLab", icon: SiGitlab, color: "#FC6D26", x: 910, y: 300 },
  { id: "netlify", name: "Netlify", icon: SiNetlify, color: "#00C7B7", x: 1070, y: 300 },
];

const ALL_NODES = [...LEFT_NODES, ...RIGHT_NODES];

// smooth S-curve from a node to the hub, meeting cleanly at the center
function connectorPath(node: Node) {
  const midX = (node.x + HUB.x) / 2;
  return `M ${node.x} ${node.y} C ${midX} ${node.y}, ${midX} ${HUB.y}, ${HUB.x} ${HUB.y}`;
}

export default function IntegrationsHub() {
  const sectionRef = useRef<HTMLElement>(null);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hubRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const paths = ALL_NODES.map((n) => pathRefs.current[n.id]).filter(Boolean) as SVGPathElement[];
      const nodes = ALL_NODES.map((n) => nodeRefs.current[n.id]).filter(Boolean) as HTMLDivElement[];

      gsap.set(".ih-eyebrow, .ih-headline, .ih-support", { opacity: 0, y: 12 });
      gsap.set(hubRef.current, { opacity: 0, scale: 0.7 });
      gsap.set(nodes, { opacity: 0, scale: 0.6 });

      if (prefersReducedMotion) {
        gsap.set(".ih-eyebrow, .ih-headline, .ih-support", { opacity: 1, y: 0 });
        gsap.set(hubRef.current, { opacity: 1, scale: 1 });
        gsap.set(nodes, { opacity: 1, scale: 1 });
        paths.forEach((p) => gsap.set(p, { strokeDashoffset: 0 }));
        return;
      }

      paths.forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });

      const tl = gsap.timeline({ delay: 0.1 });
      tl.to(".ih-eyebrow", { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" })
        .to(".ih-headline", { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.2")
        .to(".ih-support", { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.25")
        .to(hubRef.current, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" }, "-=0.1")
        .to(
          paths,
          { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut", stagger: 0.06 },
          "-=0.15"
        )
        .to(
          nodes,
          { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.8)", stagger: 0.06 },
          "-=0.6"
        );

      // gentle idle pulse on the hub
      gsap.to(hubRef.current, {
        scale: 1.04,
        duration: 2.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.4,
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="w-full bg-white py-20 md:py-28 overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Intro */}
        <div className="max-w-2xl mx-auto text-center space-y-3.5">
          <div className="ih-eyebrow inline-flex items-center gap-2 rounded-full  border-stone-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wider text-rose-600 ">
            <Workflow className="size-3" />
            Integrations
          </div>
          <h2 className="ih-headline font-heading text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-[1.18]">
            Scanlyst connects with all of your deployment &amp; security tools
          </h2>
          <p className="ih-support font-content text-base text-slate-600 leading-relaxed">
            Trigger scans from GitHub Actions, audit Supabase database policies, dispatch
            real-time alerts to Slack, or query findings directly inside your IDE via MCP.
          </p>
        </div>

        {/* Hub diagram */}
        <div className="relative mt-14 w-full max-w-[1200px] mx-auto" style={{ aspectRatio: "1200 / 420" }}>
          <svg
            viewBox="0 0 1200 420"
            className="absolute inset-0 w-full h-full"
            fill="none"
            aria-hidden="true"
          >
            {ALL_NODES.map((node) => (
              <path
                key={node.id}
                ref={(el) => {
                  pathRefs.current[node.id] = el;
                }}
                d={connectorPath(node)}
                stroke="#e7e5e4"
                strokeWidth="1.5"
              />
            ))}
          </svg>

          {/* Center hub */}
          <div
            ref={hubRef}
            className="absolute flex items-center justify-center rounded-full bg-gradient-to-tr from-rose-600 to-white/80 shadow-[0_12px_30px_-8px_rgba(225,29,72,0.5)]"
            style={{
              left: `${(HUB.x / 1200) * 100}%`,
              top: `${(HUB.y / 420) * 100}%`,
              width: `${((HUB.r * 2) / 1200) * 100}%`,
              aspectRatio: "1 / 1",
              transform: "translate(-50%, -50%)",
            }}
          >
            <ShieldCheck className="size-[42%] text-white" />
          </div>

          {/* Icon nodes */}
          {ALL_NODES.map((node) => {
            const Icon = node.icon;
            return (
              <div
                key={node.id}
                ref={(el) => {
                  nodeRefs.current[node.id] = el;
                }}
                title={node.name}
                className="absolute flex items-center justify-center rounded-full bg-white border border-stone-200 shadow-[0_4px_14px_-4px_rgba(15,23,42,0.1)]"
                style={{
                  left: `${(node.x / 1200) * 100}%`,
                  top: `${(node.y / 420) * 100}%`,
                  width: "9%",
                  aspectRatio: "1 / 1",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <Icon className="size-[42%]" style={{ color: node.color }} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}