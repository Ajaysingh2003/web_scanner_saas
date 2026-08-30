'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { TextPlugin } from 'gsap/TextPlugin';
interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function BentoCard({ children, className = '' }: BentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Initial setup for the subtle gradient glow layer inside the card
    gsap.set(glowRef.current, { opacity: 0, scale: 0.8 });
  }, { scope: cardRef });

  // Handle Mouse Enter - Smoothly scale up and fade in glow
  const handleMouseEnter = () => {
    gsap.to(cardRef.current, {
      scale: 1.02,
      borderColor: '#333335',
      y: -4,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    gsap.to(glowRef.current, {
      opacity: 0.15,
      scale: 1,
      duration: 0.4,
      ease: 'power2.out',
    });
  };

  // Handle Mouse Move - Track cursor for a dynamic lighting effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !glowRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element
    const y = e.clientY - rect.top;  // y position within the element

    // Move the light glow directly under the cursor
    gsap.to(glowRef.current, {
      x: x - 150, // Center the 300px glow div on cursor
      y: y - 150,
      duration: 0.1,
      ease: 'power1.out'
    });
  };

  // Handle Mouse Leave - Reset back to baseline perfectly
  const handleMouseLeave = () => {
    gsap.to(cardRef.current, {
      scale: 1,
      borderColor: '#1f1f23',
      y: 0,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    gsap.to(glowRef.current, {
      opacity: 0,
      scale: 0.8,
      duration: 0.4,
      ease: 'power2.out',
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden col-span-6 md:col-span-3 rounded-3xl border border-[#1f1f23] bg-[#121214] p-6 transition-colors duration-300 will-change-transform ${className}`}
    >
      {/* Dynamic Hover Glow Layer */}
      <div 
        ref={glowRef}
        className="pointer-events-none absolute left-0 top-0 h-[300px] w-[300px] rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 blur-[80px]"
      />
      
      {/* Card Content Wrapper */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}