"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ShieldCheck,
} from "lucide-react";

export default function InteractiveStepFour() {
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);

  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleMaskRef = useRef<HTMLDivElement>(null);
  const titleInnerRef = useRef<HTMLHeadingElement>(null);

  const findingRef = useRef<HTMLDivElement>(null);
  const connectorRef = useRef<HTMLDivElement>(null);
  const remediationLabelRef = useRef<HTMLDivElement>(null);

  const beforeRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);

  const verificationRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const elements = [
        eyebrowRef.current,
        findingRef.current,
        connectorRef.current,
        remediationLabelRef.current,
        beforeRef.current,
        arrowRef.current,
        afterRef.current,
        verificationRef.current,
      ];

      if (reducedMotion) {
        gsap.set(elements, {
          opacity: 1,
          y: 0,
          scale: 1,
        });

        gsap.set(titleInnerRef.current, {
          yPercent: 0,
        });

        setVerified(true);
        return;
      }

      gsap.set(elements, {
        opacity: 0,
        y: 8,
      });

      gsap.set(titleInnerRef.current, {
        yPercent: 110,
      });

      gsap.set(connectorRef.current, {
        scaleY: 0,
        transformOrigin: "top center",
      });

      gsap.set(afterRef.current, {
        opacity: 0,
        y: 10,
      });

      gsap.set(verificationRef.current, {
        opacity: 0,
        scale: 0.94,
      });

      const tl = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
        delay: 0.12,
      });

      tl.to(eyebrowRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.35,
      })

        .to(
          titleInnerRef.current,
          {
            yPercent: 0,
            duration: 0.55,
            ease: "power4.out",
          },
          "-=0.18",
        )

        .to(
          findingRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
          },
          "-=0.2",
        )

        .to(
          connectorRef.current,
          {
            opacity: 1,
            y: 0,
            scaleY: 1,
            duration: 0.4,
            ease: "power3.inOut",
          },
          "-=0.1",
        )

        .to(
          remediationLabelRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
          },
          "-=0.12",
        )

        .to(
          beforeRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.42,
          },
          "-=0.12",
        )

        .to(
          arrowRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.28,
          },
          "-=0.06",
        )

        .to(
          afterRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.48,
            ease: "power4.out",
          },
          "-=0.06",
        )

        .to(
          verificationRef.current,
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.38,
            ease: "power3.out",
          },
          "-=0.15",
        )

        .call(() => setVerified(true));

      return () => {
        tl.kill();
      };
    },
    {
      scope: rootRef,
    },
  );

  const handleCopy = async () => {
    const patch =
      "Access-Control-Allow-Origin: https://app.example.com";

    try {
      await navigator.clipboard.writeText(patch);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="
        relative
        flex
        h-full
        min-h-[310px]
        w-full
        flex-col
        overflow-hidden
        rounded-[22px]
        borderz
        border-stone-200
        bg-white
        px-5
        py-5
        sm:px-6
        sm:py-6
      "
    >
      {/* ---------------------------------
          TOP
      ---------------------------------- */}

      <div>
        <div
          ref={eyebrowRef}
          className="
            mb-3
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
              font-mono
              text-[9px]
              font-semibold
              uppercase
              tracking-[0.14em]
              text-stone-400
            "
          >
            <span
              className="
                flex
                size-5
                items-center
                justify-center
                rounded-md
                border
                border-stone-200
                bg-stone-50
              "
            >
              <ShieldCheck
                className="size-3 text-stone-600"
                strokeWidth={1.8}
              />
            </span>

            Suggested remediation
          </div>

          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy remediation patch"
            className="
              flex
              h-7
              items-center
              gap-1.5
              rounded-md
              border
              border-stone-200
              bg-white
              px-2
              font-mono
              text-[9px]
              font-medium
              text-stone-500
              outline-none
              transition-colors
              hover:bg-stone-50
              hover:text-stone-800
              focus-visible:ring-2
              focus-visible:ring-rose-200
            "
          >
            {copied ? (
              <Check className="size-3 text-emerald-600" />
            ) : (
              <Copy className="size-3" />
            )}

            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Masked heading */}
        <div
          ref={titleMaskRef}
          className="overflow-hidden"
        >
          <h3
            ref={titleInnerRef}
            className="
              text-[19px]
              font-semibold
              leading-tight
              tracking-[-0.025em]
              text-slate-950
            "
          >
            Restrict allowed origins
          </h3>
        </div>

        <p
          className="
            mt-2
            max-w-[460px]
            text-[12px]
            leading-[1.6]
            text-stone-500
          "
        >
          Replace the wildcard policy with an explicitly trusted application
          origin.
        </p>
      </div>

      {/* ---------------------------------
          FINDING
      ---------------------------------- */}

      <div
        ref={findingRef}
        className="
          mt-5
          flex
          items-center
          justify-between
          gap-4
          border-y
          border-stone-100
          py-3
        "
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="size-1.5 shrink-0 rounded-full bg-rose-500" />

          <div className="min-w-0">
            <div
              className="
                font-mono
                text-[8px]
                font-bold
                uppercase
                tracking-[0.12em]
                text-rose-600
              "
            >
              High severity
            </div>

            <div
              className="
                mt-0.5
                truncate
                text-[11px]
                font-medium
                text-slate-700
              "
            >
              CORS wildcard origin
            </div>
          </div>
        </div>

        <code
          className="
            hidden
            shrink-0
            font-mono
            text-[9px]
            text-stone-400
            sm:block
          "
        >
          /config/api
        </code>
      </div>

      {/* ---------------------------------
          CONNECTION
      ---------------------------------- */}

      <div
        ref={connectorRef}
        className="
          ml-[2px]
          h-4
          w-px
          bg-stone-200
        "
      />

      {/* ---------------------------------
          REMEDIATION
      ---------------------------------- */}

      <div
        ref={remediationLabelRef}
        className="
          mb-2
          font-mono
          text-[8px]
          font-semibold
          uppercase
          tracking-[0.14em]
          text-stone-400
        "
      >
        Configuration change
      </div>

      <div className="relative">
        {/* BEFORE */}

        <div
          ref={beforeRef}
          className="
            relative
            overflow-hidden
            rounded-xl
            border
            border-rose-100
            bg-rose-50/45
            px-4
            py-3
          "
        >
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="
                font-mono
                text-[8px]
                font-bold
                uppercase
                tracking-[0.1em]
                text-rose-500
              "
            >
              Before
            </span>

            <div className="h-px flex-1 bg-rose-100" />
          </div>

          <code
            className="
              block
              break-all
              font-mono
              text-[10px]
              leading-5
              text-rose-800
            "
          >
            Access-Control-Allow-Origin: *
          </code>
        </div>

        {/* connector arrow */}

        <div
          ref={arrowRef}
          className="
            relative
            z-10
            mx-auto
            flex
            h-7
            w-7
            items-center
            justify-center
          "
        >
          <div
            className="
              flex
              size-5
              items-center
              justify-center
              rounded-full
              border
              border-stone-200
              bg-white
              text-stone-400
            "
          >
            <ArrowRight
              className="size-2.5 rotate-90"
              strokeWidth={1.8}
            />
          </div>
        </div>

        {/* AFTER */}

        <div
          ref={afterRef}
          className="
            relative
            overflow-hidden
            rounded-xl
            border
            border-emerald-100
            bg-emerald-50/45
            px-4
            py-3
          "
        >
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="
                font-mono
                text-[8px]
                font-bold
                uppercase
                tracking-[0.1em]
                text-emerald-600
              "
            >
              After
            </span>

            <div className="h-px flex-1 bg-emerald-100" />
          </div>

          <code
            className="
              block
              break-all
              font-mono
              text-[10px]
              font-medium
              leading-5
              text-emerald-800
            "
          >
            Access-Control-Allow-Origin: https://app.example.com
          </code>
        </div>
      </div>

      {/* ---------------------------------
          VERIFIED
      ---------------------------------- */}

      <div
        ref={verificationRef}
        className="
          mt-4
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div className="flex items-center gap-2">
          <span
            className={`
              flex
              size-5
              items-center
              justify-center
              rounded-full
              border

              ${
                verified
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-stone-200 bg-stone-50"
              }
            `}
          >
            <CheckCircle2
              className={`
                size-3

                ${
                  verified
                    ? "text-emerald-600"
                    : "text-stone-400"
                }
              `}
              strokeWidth={2}
            />
          </span>

          <div>
            <div
              className="
                text-[10px]
                font-medium
                text-slate-700
              "
            >
              {verified ? "Patch verified" : "Verifying patch"}
            </div>

            <div
              className="
                font-mono
                text-[8px]
                text-stone-400
              "
            >
              Policy validation passed
            </div>
          </div>
        </div>

        <div
          className="
            font-mono
            text-[8px]
            uppercase
            tracking-[0.12em]
            text-stone-300
          "
        >
          CORS / 04
        </div>
      </div>
    </div>
  );
}