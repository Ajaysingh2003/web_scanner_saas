import { ImageResponse } from "next/og";

export const alt = "Scanlyst website security and performance audit platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", color: "#0f172a", background: "linear-gradient(135deg, #fff 0%, #fff7f8 55%, #f1f5f9 100%)", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: 30, fontWeight: 700 }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "white", background: "#f43f5e" }}>S</div>
        Scanlyst
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 960 }}>
        <div style={{ color: "#e11d48", fontSize: 22, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>Understand every risk before users do</div>
        <div style={{ marginTop: 20, fontSize: 62, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-0.035em" }}>Security, SEO, performance and accessibility—in one website audit.</div>
        <div style={{ marginTop: 26, color: "#64748b", fontSize: 26 }}>Prioritized findings. Clear evidence. Actionable remediation.</div>
      </div>
      <div style={{ display: "flex", gap: "14px", color: "#475569", fontSize: 18 }}>
        {['Vulnerability scanning', 'AI search readiness', 'Core Web Vitals', 'WCAG checks'].map((label) => <span key={label} style={{ border: "1px solid #e2e8f0", borderRadius: 999, background: "rgba(255,255,255,.8)", padding: "10px 16px" }}>{label}</span>)}
      </div>
    </div>,
    size,
  );
}
