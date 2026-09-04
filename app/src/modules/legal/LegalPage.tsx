import Link from "next/link";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
};

export default function LegalPage({ eyebrow, title, description, updated, sections }: LegalPageProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-40 sm:px-8">
      <header className="max-w-3xl border-b border-stone-200 pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">{eyebrow}</p>
        <h1 className="mt-4 font-heading text-4xl tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
        <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
        <p className="mt-5 text-sm text-slate-400">Last updated: {updated}</p>
      </header>

      <div className="grid gap-12 pt-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label={`${title} sections`} className="sticky top-28 space-y-2 border-l border-stone-200 pl-4">
            {sections.map((section, index) => (
              <a key={section.title} href={`#section-${index + 1}`} className="block text-sm text-slate-500 hover:text-slate-950">
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 space-y-10">
          {sections.map((section, index) => (
            <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-28">
              <h2 className="font-heading text-2xl text-slate-950">{section.title}</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-7 text-slate-600">
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.items && (
                  <ul className="list-disc space-y-2 pl-5 marker:text-rose-500">
                    {section.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
              </div>
            </section>
          ))}

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm leading-6 text-slate-600">
            Questions about this policy? Email <Link className="font-medium text-slate-950 underline underline-offset-4" href="mailto:support@scanlyst.dev">support@scanlyst.dev</Link>.
          </div>
        </article>
      </div>
    </main>
  );
}
