export type ReportFormat = "pdf" | "markdown";

export async function downloadReport(scanId: string, format: ReportFormat) {
  const response = await fetch(`/api/reports/${scanId}/export?format=${format}`, {
    credentials: "include",
  });

  if (!response.ok) {
    let message = "Could not export this report";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // Keep the friendly fallback when the server does not return JSON.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1]
    || `scanlyst-report.${format === "pdf" ? "pdf" : "md"}`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
