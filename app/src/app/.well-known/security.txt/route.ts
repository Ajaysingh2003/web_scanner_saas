import { absoluteUrl, siteConfig } from "@/lib/site-config";

export function GET() {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  const content = [
    `Contact: mailto:${siteConfig.securityEmail}`,
    `Policy: ${absoluteUrl("/responsible-disclosure")}`,
    `Canonical: ${absoluteUrl("/.well-known/security.txt")}`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en",
  ].join("\n");

  return new Response(`${content}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
