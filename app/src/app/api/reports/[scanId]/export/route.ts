import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const apiBase = () => {
  const base = (process.env.BASE_API || "http://localhost:8000").replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "markdown";
  const token = (await cookies()).get("access_token")?.value;
  if (!token) return Response.json({ detail: "Authentication required" }, { status: 401 });
  const response = await fetch(`${apiBase()}/v1/scans/${scanId}/export?format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return Response.json({ detail: "Could not export this report" }, { status: response.status });
  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": response.headers.get("content-disposition") || `attachment; filename="aetherscan-report.${format === "pdf" ? "pdf" : "md"}"`,
    },
  });
}
