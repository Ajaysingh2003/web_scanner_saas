// app/components/Navbar.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTRPC } from '@/trpc/client';
import { useQuery } from '@tanstack/react-query';
import { AuthUser } from '@/modules/user/types';

const navLinks = [
  { href: '/product', label: 'Product' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/changelog', label: 'Changelog' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const handleSubmit = () => {
    router.push("/login");
  };
  const trpc = useTRPC();
  const { data } = useQuery(trpc.user.profile.queryOptions());

  const user = data as AuthUser | null | undefined;

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
              <Image src="/logo.png" alt="Booksly logo" fill className="object-contain" />
            </div>
            <span className="text-base italic font-heading font-bold text-neutral-900 tracking-tight">ScanLyst</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-1.5 text-[13px] font-medium  hover:text-neutral-900 rounded-md transition-all duration-200 hover:bg-neutral-200/50"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-1.5">
            {!user&& <Button
            onClick={handleSubmit}
              variant="ghost"
              className="text-[13px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50 transition-all duration-200 cursor-pointer h-8 px-3"
            >
              Sign in
            </Button>}
            { !user ? <Button
            onClick={handleSubmit}
              className="text-[13px] bg-background-btn"
            >
              Get Started
            </Button> : <Button onClick={()=>router.push("/dashboard")} className={"text-[13px] bg-background-btn"}>Dashboard</Button>}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2  rounded-lg text-neutral-600 hover:bg-neutral-200/50 transition-all duration-200"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pt-3 pb-2 mt-2 border-t border-neutral-200/60 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 text-[14px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40 rounded-lg transition-all duration-200"
              >
                {link.label}
                <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
            <div className="pt-2 mt-1 border-t border-neutral-200/60 space-y-1.5">
              <Button
                variant="ghost"
                className="w-full text-[14px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/40 transition-all duration-200 cursor-pointer h-9 justify-start px-3"
              >
                Sign in
              </Button>
              <Button
                className="w-full text-[13px] font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-all duration-200 cursor-pointer h-9"
              >
                Get Started
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}