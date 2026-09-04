import { NextRequest, NextResponse } from "next/server";

type RefreshResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

const REFRESH_THRESHOLD_SECONDS = 10 * 60;
const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function refreshEndpoint() {
  const base = (process.env.BASE_API || "http://localhost:8000/api").replace(/\/$/, "");
  const api = base.endsWith("/api") ? base : `${base}/api`;
  return `${api}/v1/auth/refresh`;
}

function needsRefresh(token: string | undefined) {
  if (!token) return true;
  try {
    const payloadPart = token.split(".")[1];
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return !payload.exp || payload.exp <= Math.floor(Date.now() / 1000) + REFRESH_THRESHOLD_SECONDS;
  } catch {
    return true;
  }
}

function loginRedirect(request: NextRequest, reason: string) {
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  login.searchParams.set("reason", reason);
  const response = NextResponse.redirect(login);
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  return response;
}

function forwardedResponse(request: NextRequest, tokens: RefreshResponse) {
  const headers = new Headers(request.headers);
  const cookies = request.cookies
    .getAll()
    .filter(({ name }) => name !== "access_token" && name !== "refresh_token")
    .map(({ name, value }) => `${name}=${value}`);
  cookies.push(`access_token=${tokens.access_token}`, `refresh_token=${tokens.refresh_token}`);
  headers.set("cookie", cookies.join("; "));

  const response = NextResponse.next({ request: { headers } });
  const secure = process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:";
  const options = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  response.cookies.set("access_token", tokens.access_token, {
    ...options,
    maxAge: tokens.expires_in,
  });
  response.cookies.set("refresh_token", tokens.refresh_token, {
    ...options,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  if (!needsRefresh(accessToken)) return NextResponse.next();

  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (!refreshToken) return loginRedirect(request, "session_expired");

  try {
    const refresh = await fetch(refreshEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!refresh.ok) return loginRedirect(request, "session_expired");
    const tokens = (await refresh.json()) as RefreshResponse;
    if (!tokens.access_token || !tokens.refresh_token) {
      return loginRedirect(request, "session_expired");
    }
    return forwardedResponse(request, tokens);
  } catch {
    return loginRedirect(request, "session_unavailable");
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/billing/success"],
};
