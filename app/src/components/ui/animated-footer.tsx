"use client";

import Link from "next/link";
import React, { useEffect, useRef } from "react";
import { FaGithub, FaXTwitter, FaLinkedinIn, FaDiscord } from "react-icons/fa6";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* ============================================================================
   FOOTER NAV LINK
============================================================================ */

function NavLink({
  href,
  label,
  badge,
  external = false,
}: {
  href: string;
  label: string;
  badge?: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="
        group
        flex
        min-h-7
        items-center
        justify-between
        gap-3
        text-[13px]
        text-slate-500
        transition-colors
        duration-200
        hover:text-slate-950
      "
    >
      <span className="flex items-center gap-2">
        {label}

        {badge && (
          <span
            className="
              rounded-md
              border
              border-rose-100
              bg-rose-50/70
              px-1.5
              py-0.5
              font-mono
              text-[9px]
              font-semibold
              uppercase
              tracking-[0.08em]
              text-rose-600
            "
          >
            {badge}
          </span>
        )}
      </span>

      {external && <ArrowUpRight
        className="
          size-3
          shrink-0
          text-stone-300
          transition-[transform,color]
          duration-200
          ease-out
          group-hover:-translate-y-[1px]
          group-hover:translate-x-[1px]
          group-hover:text-rose-500
        "
      />}
    </Link>
  );
}

/* ============================================================================
   OPTIMIZED DOT MATRIX
============================================================================ */

function BigTextDotMatrixCanvas({
  text = "Scanlyst — Modern Web Security",
  className,
}: {
  text?: string;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pointerRef = useRef({
    x: -9999,
    y: -9999,
    inside: false,
    intensity: 0,
  });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;

    if (!wrapper || !canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", {
      willReadFrequently: true,
    });

    if (!offCtx) return;

    const spacing = 11;
    const textDotRadius = 1.35;
    const ambientDotRadius = 0.7;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;

    let pixels: Uint8ClampedArray | null = null;

    let rafId = 0;
    let running = false;
    let visible = true;

    const rebuildTextMask = () => {
      const rect = wrapper.getBoundingClientRect();

      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.max(1, Math.floor(width / spacing));

      rows = Math.max(1, Math.floor(height / spacing));

      offscreen.width = cols;
      offscreen.height = rows;

      offCtx.clearRect(0, 0, cols, rows);

      /*
       * Keep the complete phrase inside
       * the matrix on wide + narrow screens.
       */
      const widthBasedFont = cols / Math.max(text.length * 0.57, 1);

      const heightBasedFont = rows * 0.56;

      const fontSize = Math.max(5, Math.min(widthBasedFont, heightBasedFont));

      offCtx.fillStyle = "#000";

      offCtx.font = `800 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;

      offCtx.textAlign = "center";
      offCtx.textBaseline = "middle";

      offCtx.fillText(text, cols / 2, rows / 2);

      pixels = offCtx.getImageData(0, 0, cols, rows).data;
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      if (!pixels) return;

      const elapsed = now / 1000;

      const pointer = pointerRef.current;

      const targetIntensity = pointer.inside ? 1 : 0;

      pointer.intensity += (targetIntensity - pointer.intensity) * 0.075;

      const hoverRadius = 125;

      for (let column = 0; column < cols; column++) {
        for (let row = 0; row < rows; row++) {
          const x = column * spacing + spacing / 2;

          const y = row * spacing + spacing / 2;

          const pixelIndex = (row * cols + column) * 4;

          const textPixel = pixels[pixelIndex + 3] > 55;

          const dx = x - pointer.x;

          const dy = y - pointer.y;

          const distance = Math.sqrt(dx * dx + dy * dy);

          /*
           * Slow ambient movement.
           * Almost imperceptible.
           */
          const ambient =
            0.5 + Math.sin(elapsed * 0.7 + x * 0.008 + y * 0.007) * 0.5;

          let radius = textPixel ? textDotRadius : ambientDotRadius;

          let alpha = textPixel ? 0.24 + ambient * 0.06 : 0.025;

          /*
           * Base:
           * rose for text
           * stone for surrounding dots.
           */
          let red = textPixel ? 225 : 168;

          let green = textPixel ? 29 : 162;

          let blue = textPixel ? 72 : 158;

          if (distance < hoverRadius && pointer.intensity > 0.01) {
            const falloff =
              Math.pow(1 - distance / hoverRadius, 2) * pointer.intensity;

            alpha = Math.min(0.92, alpha + falloff * (textPixel ? 0.55 : 0.13));

            radius += falloff * (textPixel ? 0.75 : 0.35);

            /*
             * Hover remains brand rose.
             * No rainbow / cyan / indigo.
             */
            red = Math.round(red + (244 - red) * falloff);

            green = Math.round(green + (63 - green) * falloff);

            blue = Math.round(blue + (94 - blue) * falloff);
          }

          ctx.beginPath();

          ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;

          ctx.arc(x, y, radius, 0, Math.PI * 2);

          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      if (!running) return;

      if (visible) {
        draw(now);
      }

      rafId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reducedMotion) {
        return;
      }

      running = true;

      rafId = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;

      cancelAnimationFrame(rafId);
    };

    const resizeObserver = new ResizeObserver(() => {
      rebuildTextMask();

      if (reducedMotion) {
        draw(performance.now());
      }
    });

    resizeObserver.observe(wrapper);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;

        if (visible && !reducedMotion) {
          start();
        } else if (!visible) {
          stop();
        }
      },
      {
        rootMargin: "80px",
      },
    );

    intersectionObserver.observe(wrapper);

    rebuildTextMask();

    if (reducedMotion) {
      draw(performance.now());
    } else {
      start();
    }

    return () => {
      stop();

      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [text]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    pointerRef.current.x = event.clientX - rect.left;

    pointerRef.current.y = event.clientY - rect.top;

    pointerRef.current.inside = true;
  };

  return (
    <div
      ref={wrapperRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => {
        pointerRef.current.inside = true;
      }}
      onPointerLeave={() => {
        pointerRef.current.inside = false;
      }}
      className={cn("relative size-full overflow-hidden", className)}
    >
      <canvas ref={canvasRef} className="block size-full" />

      {/* edge falloff */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[linear-gradient(to_right,#fbfbfa_0%,transparent_10%,transparent_90%,#fbfbfa_100%)]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[linear-gradient(to_bottom,#fbfbfa_0%,transparent_25%,transparent_75%,#fbfbfa_100%)]
          opacity-60
        "
      />
    </div>
  );
}

/* ============================================================================
   FOOTER
============================================================================ */

export function AnimatedFooter() {
  const footerRef = useRef<HTMLElement>(null);

  const launchRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const launch = launchRef.current;

      if (!launch) return;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const elements = launch.querySelectorAll("[data-launch-reveal]");

      if (reducedMotion) {
        gsap.set(elements, {
          opacity: 1,
          y: 0,
        });

        return;
      }

      gsap.set(elements, {
        opacity: 0,
        y: 18,
      });

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) {
            return;
          }

          gsap.to(elements, {
            opacity: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.08,
            ease: "power3.out",
          });

          observer.disconnect();
        },
        {
          threshold: 0.2,
        },
      );

      observer.observe(launch);

      return () => {
        observer.disconnect();
      };
    },
    {
      scope: footerRef,
    },
  );

  return (
    <footer
      ref={footerRef}
      className="
        relative
        w-full
        overflow-hidden
        border-t
        border-stone-200
        bg-white
        text-slate-900
      "
    >
      {/* ====================================================
          LAUNCH CTA
      ===================================================== */}

      <div
        style={{
          backgroundImage: "radial-gradient(#D2D2D2 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
        ref={launchRef}
        className="
          relative
          overflow-hidden
          border-b
          border-stone-200/80
          bg-[#fbfbfa]
        "
      >
        {/* subtle rose field */}
        <div
          className="
            pointer-events-none
            absolute
            left-1/2
            top-full
            h-[420px]
            w-[720px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-rose-100/45
            blur-[110px]
          "
        />

        <div
          className="
            relative
            z-10
            mx-auto
            max-w-[1200px]
            px-5
            py-20
            text-center
            sm:px-6
            sm:py-28
            lg:px-8
          "
        >
          {/* headline */}
          {/* <h2
            data-launch-reveal
            className="
              mx-auto
              mt-6
              max-w-[760px]
              font-heading
              text-[38px]
              font-semibold
              leading-[1.08]
              tracking-[-0.04em]
              text-slate-950
              sm:text-5xl
              lg:text-[58px]
            "
          >
            Your website changes.
            <br />

            <span
              className="
                font-serif
                font-medium
                italic
                text-rose-600
              "
            >
              Your security should keep up.
            </span>
          </h2> */}

          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-[1.18]">
            <span className="tc-mask-child block">Your website changes.</span>

            <span className="tc-mask-child block italic font-medium font-serif bg-gradient-to-r from-rose-400 to-white/70 bg-clip-text text-transparent">
              Your security should keep up.
            </span>
          </h2>

          <p
            data-launch-reveal
            className="
              mx-auto
              mt-5
              max-w-[560px]
              text-[12px]
              leading-7
              text-slate-600
              sm:text-[14px]
            "
          >
            Find exposed configuration, security issues and technical
            regressions before they become bigger problems.
          </p>

          {/* CTAs */}
          <div
            data-launch-reveal
            className="
              mt-8
              flex
              flex-col
              items-center
              justify-center
              gap-3
              sm:flex-row
            "
          >
            <Button
              // href="/login"
              className="
                group
                inline-flex
                h-10z
                items-center
                justify-center
                gap-2
                rounded-lg
                px-2
                text-xs
                font-medium
                text-white
                transition-colors
                duration-200
                bg-background-btn
              "
            >
              Open Scanlyst
              <ArrowRight
                className="
                  size-4
                  text-white/60
                  transition-transform
                  duration-200
                  group-hover:translate-x-0.5
                "
              />
            </Button>

            <Button
              className="
                inline-flex
                items-center
                justify-center
                rounded-lg
                border
                border-stone-300
                bg-white
                px-2
                text-sm
                font-medium
                text-slate-700
                transition-[background-color,border-color,color]
                duration-200
                hover:border-stone-400
                hover:bg-stone-50
                hover:text-slate-950
              "
            >
              View pricing
            </Button>
          </div>

          {/* simple supporting line */}
          <div
            data-launch-reveal
            className="
              mt-8
              flex
              flex-wrap
              items-center
              justify-center
              gap-x-5
              gap-y-2
              text-xs
              text-stone-400
            "
          >
            <span>Security audits</span>

            <span className="hidden size-1 rounded-full bg-stone-300 sm:block" />

            <span>Technical monitoring</span>

            <span className="hidden size-1 rounded-full bg-stone-300 sm:block" />

            <span>Actionable remediation</span>
          </div>
        </div>
      </div>

      {/* ====================================================
          LINKS / BRAND
      ===================================================== */}

      <div
        className="
          border-b
          border-stone-200/80
          bg-white
        "
      >
        <div
          className="
            mx-auto
            grid
            max-w-[1200px]
            grid-cols-1
            gap-12
            px-5
            py-14
            sm:px-6
            md:grid-cols-12
            lg:px-8
            lg:py-16
          "
        >
          {/* brand */}
          <div
            className="
              md:col-span-5
              lg:col-span-6
            "
          >
            <Link
              href="/"
              className="
                inline-flex
                items-center
                gap-2
              "
            >
              <span
                className="
                  font-heading
                  text-2xl
                  font-semibold
                  tracking-[-0.035em]
                   italic
                  text-slate-950
                "
              >
                Scanlyst
              </span>

              {/* <span className="size-1.5 rounded-full bg-rose-500" /> */}
            </Link>

            <p
              className="
                mt-4
                max-w-[390px]
                text-sm
                leading-6
                text-slate-500
              "
            >
              Website security and attack surface intelligence for teams that
              want findings they can actually act on.
            </p>

            <div className="mt-6 flex items-center gap-2">
              {[
                {
                  href: "https://twitter.com",
                  label: "X / Twitter",
                  icon: FaXTwitter,
                },
                {
                  href: "https://github.com",
                  label: "GitHub",
                  icon: FaGithub,
                },
                {
                  href: "https://linkedin.com",
                  label: "LinkedIn",
                  icon: FaLinkededinSafe,
                },
                {
                  href: "https://discord.com",
                  label: "Discord",
                  icon: FaDiscord,
                },
              ].map((social) => {
                const Icon = social.icon;

                return (
                  <Link
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="
                      flex
                      size-9
                      items-center
                      justify-center
                      rounded-lg
                      border
                      border-stone-200
                      bg-white
                      text-stone-500
                      transition-[background-color,border-color,color,transform]
                      duration-200
                      hover:-translate-y-[1px]
                      hover:border-rose-200
                      hover:bg-rose-50/60
                      hover:text-rose-600
                    "
                  >
                    <Icon className="size-3.5" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* nav */}
          <div
            className="
              grid
              grid-cols-2
              gap-8
              sm:grid-cols-3
              md:col-span-7
              lg:col-span-6
            "
          >
            <FooterColumn title="Product">
              <NavLink href="/dashboard" label="Dashboard" />

              <NavLink href="/pricing" label="Pricing" />

              <NavLink href="/scans" label="Audit scope" />

              <NavLink
                href="/scans/uptime-heartbeat"
                label="Monitoring"
                badge="24/7"
              />
            </FooterColumn>

            <FooterColumn title="Support">
              <NavLink href="/#faq" label="FAQ" />

              <NavLink href="mailto:support@scanlyst.dev" label="Contact" />

              <NavLink
                href="https://status.scanlyst.dev"
                label="System status"
                badge="Live"
                external
              />
            </FooterColumn>

            <FooterColumn title="Legal">
              <NavLink href="/privacy" label="Privacy" />
              <NavLink href="/terms" label="Terms" />
              <NavLink href="/cookies" label="Cookies" />
              <NavLink href="/acceptable-use" label="Acceptable use" />
              <NavLink href="/refund-policy" label="Refunds" />
              <NavLink href="/responsible-disclosure" label="Disclosure" />
            </FooterColumn>
          </div>
        </div>
      </div>

      {/* ====================================================
          BRAND CANVAS
      ===================================================== */}

      <div
        className="
          relative
          h-44
          overflow-hidden
          border-b
          border-stone-200/80
          bg-[#fbfbfa]
          sm:h-56
        "
      >
        
        <BigTextDotMatrixCanvas text="scanlyst" className="absolute inset-0" />

        <div
          className="
            pointer-events-none
            absolute
            bottom-4
            left-5
            font-mono
            text-[10px]
            uppercase
            tracking-[0.12em]
            text-stone-400
            sm:left-8
          "
        >
          Move your cursor to inspect
        </div>
      </div>

      {/* ====================================================
          COPYRIGHT
      ===================================================== */}

      <div className="bg-white">
        <div
          className="
            mx-auto
            flex
            max-w-[1200px]
            flex-col
            gap-3
            px-5
            py-5
            text-xs
            text-stone-400
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-6
            lg:px-8
          "
        >
          <span>
            © {new Date().getFullYear()} Scanlyst. All rights reserved.
          </span>

          <span>Security should be understandable.</span>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================================
   FOOTER COLUMN
============================================================================ */

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4
        className="
          mb-4
          text-xs
          font-semibold
          text-slate-900
        "
      >
        {title}
      </h4>

      <div className="space-y-1">{children}</div>
    </div>
  );
}

/*
 * Alias to keep the social map above compact.
 * You can replace this with FaLinkedinIn directly if preferred.
 */
const FaLinkededinSafe = FaLinkedinIn;
