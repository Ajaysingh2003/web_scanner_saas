"use client";

import Link from "next/link";
import { type LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-center">
      <Icon className="mx-auto size-10 text-slate-300" />
      <h1 className="mt-4 font-heading text-2xl text-slate-950">{title}</h1>
      <p className="mt-2 font-content text-sm text-slate-500">{description}</p>
      {actionLabel && actionHref && (
        <Link
          className="bg-background-btn mt-6 inline-flex h-10 items-center rounded-lg px-4 text-sm text-white"
          href={actionHref}
        >
          {actionLabel}
        </Link>
      )}
    </section>
  );
}
