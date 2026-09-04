import Image from "next/image";

const supportingScreens = [
  {
    src: "/scanlyst-security-report.webp",
    alt: "Scanlyst security report showing vulnerability checks and security headers",
    label: "Security evidence",
    description: "Prioritized findings with the technical context needed to act.",
    width: 1569,
    height: 900,
  },
  {
    src: "/scanlyst-scan-progress.webp",
    alt: "Scanlyst website audit in progress across multiple diagnostic categories",
    label: "Live scan progress",
    description: "Follow every audit pillar and scanner from one workspace.",
    width: 1569,
    height: 900,
  },
  {
    src: "/scanlyst-monitoring-alerts.webp",
    alt: "Scanlyst recurring website monitoring dashboard",
    label: "Continuous monitoring",
    description: "Schedule recurring checks and review uptime or incidents quickly.",
    width: 2912,
    height: 1670,
  },
] as const;

export default function ProductScreenshots() {
  return (
    <section
      aria-labelledby="product-proof-title"
      className="w-full px-4 py-20 sm:px-6 md:py-28 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600">
            Inside Scanlyst
          </p>
          <h2
            id="product-proof-title"
            className="font-heading mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          >
            From first scan to continuous oversight.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-600">
            See the evidence, understand what matters, and keep every monitored
            website visible from one focused workspace.
          </p>
        </div>

        <figure className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)] sm:p-3">
          <Image
            src="/scanlyst-dashboard-overview.webp"
            alt="Scanlyst project dashboard with audit score, findings, usage, and severity overview"
            width={1569}
            height={900}
            priority={false}
            sizes="(max-width: 768px) 100vw, 1152px"
            className="h-auto w-full rounded-xl"
          />
          <figcaption className="px-3 py-3 text-xs text-slate-500 sm:px-4">
            A clear project overview for scores, findings, scan usage, and recent activity.
          </figcaption>
        </figure>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {supportingScreens.map((screen) => (
            <figure
              key={screen.src}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_-30px_rgba(15,23,42,0.3)]"
            >
              <div className="aspect-[16/9] overflow-hidden border-b border-slate-100 bg-slate-50">
                <Image
                  src={screen.src}
                  alt={screen.alt}
                  width={screen.width}
                  height={screen.height}
                  sizes="(max-width: 1024px) 100vw, 360px"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <figcaption className="p-5">
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  {screen.label}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  {screen.description}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
