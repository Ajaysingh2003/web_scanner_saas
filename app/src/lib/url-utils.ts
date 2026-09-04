export function normalizeWebsiteUrl(rawUrl: string): string {
  let cleaned = rawUrl.trim();
  if (!cleaned) return cleaned;
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

export function getProjectTitleFromUrl(rawUrl: string): string {
  const cleaned = normalizeWebsiteUrl(rawUrl);
  if (!cleaned) return "New Project";

  try {
    const parsed = new URL(cleaned);
    let host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!host) return "New Project";

    // e.g. "scanlyst.dev" -> "Scanlyst", "sub.domain.co.uk" -> "Sub"
    const parts = host.split(".");
    if (parts.length >= 2) {
      const baseName = parts[0];
      if (baseName.length > 0) {
        return baseName.charAt(0).toUpperCase() + baseName.slice(1);
      }
    }
    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch {
    const fallback = rawUrl
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0];
    if (fallback) {
      return fallback.charAt(0).toUpperCase() + fallback.slice(1);
    }
    return "New Project";
  }
}
