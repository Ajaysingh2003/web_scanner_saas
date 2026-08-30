'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface VulnerabilityCurveProps {
  className?: string;
}

export default function VulnerabilityCurve({ className = '' }: VulnerabilityCurveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const nodesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      // 1. Fade in the fill area
      tl.fromTo(
        fillRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1.2 },
        0
      );

      // 2. Stroke draw animation
      if (pathRef.current) {
        const length = pathRef.current.getTotalLength();
        gsap.set(pathRef.current, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });
        tl.to(
          pathRef.current,
          { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut' },
          0.2
        );
      }

      // 3. Nodes pop in sequentially
      if (nodesRef.current) {
        const circles = nodesRef.current.querySelectorAll('circle');
        tl.fromTo(
          circles,
          { scale: 0, opacity: 0, transformOrigin: 'center center' },
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            stagger: 0.15,
            ease: 'back.out(2)',
          },
          0.8
        );
      }

      // 4. Subtle continuous pulse on the last node
      const lastNode = nodesRef.current?.querySelectorAll('circle');
      if (lastNode && lastNode.length >= 2) {
        const outer = lastNode[lastNode.length - 2]; // the glow ring
        gsap.to(outer, {
          attr: { r: 14 },
          opacity: 0.6,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden  ${className}`}
    >
      <svg
        viewBox="0 0 2000 1400"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto select-none"
      >
        <defs>
          <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="greenGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="splitGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.06" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        <g stroke="#1f1f23" strokeWidth="2" strokeDasharray="8 8" opacity="0.6">
          <line x1="0" y1="350" x2="2000" y2="350" />
          <line x1="0" y1="700" x2="2000" y2="700" />
          <line x1="0" y1="1050" x2="2000" y2="1050" />
          <line x1="400" y1="0" x2="400" y2="1400" />
          <line x1="800" y1="0" x2="800" y2="1400" />
          <line x1="1200" y1="0" x2="1200" y2="1400" />
          <line x1="1600" y1="0" x2="1600" y2="1400" />
        </g>

        <path
          ref={fillRef}
          d="M0 650 C 200 600, 250 350, 400 300 C 600 240, 700 400, 800 500 C 1000 650, 1050 950, 1200 1050 C 1350 1150, 1450 1200, 1600 1200 C 1750 1200, 1850 1080, 2000 1050 L 2000 1400 L 0 1400 Z"
          fill="url(#splitFill)"
        />

        <path
          ref={pathRef}
          d="M0 650 C 200 600, 250 350, 400 300 C 600 240, 700 400, 800 500 C 1000 650, 1050 950, 1200 1050 C 1350 1150, 1450 1200, 1600 1200 C 1750 1200, 1850 1080, 2000 1050"
          fill="none"
          stroke="url(#splitGradient)"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <g ref={nodesRef}>
          <circle cx="0" cy="650" r="10" fill="#ef4444" filter="url(#redGlow)" />
          <circle cx="0" cy="650" r="5" fill="#ffffff" />

          <circle cx="400" cy="300" r="10" fill="#ef4444" filter="url(#redGlow)" />
          <circle cx="400" cy="300" r="5" fill="#ffffff" />

          <circle
            cx="800"
            cy="500"
            r="14"
            fill="#18181b"
            stroke="url(#splitGradient)"
            strokeWidth="4"
          />
          <circle cx="800" cy="500" r="6" fill="#ffffff" />

          <circle cx="1200" cy="1050" r="10" fill="#10b981" filter="url(#greenGlow)" />
          <circle cx="1200" cy="1050" r="5" fill="#ffffff" />

          <circle cx="1600" cy="1200" r="10" fill="#10b981" filter="url(#greenGlow)" />
          <circle cx="1600" cy="1200" r="5" fill="#ffffff" />

          <circle cx="2000" cy="1050" r="10" fill="#10b981" filter="url(#greenGlow)" />
          <circle cx="2000" cy="1050" r="5" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}