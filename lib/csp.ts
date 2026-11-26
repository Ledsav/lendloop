/**
 * The Content-Security-Policy header: what the browser may load and where it may connect. Built from
 * the environment, so the same code works locally, in Codespaces and on the deployed site.
 */

/** Clerk's Frontend API host, encoded in the publishable key: pk_test_/pk_live_ + base64("host$"). */
export function clerkFrontendHost(publishableKey: string | undefined): string | null {
  const match = publishableKey?.match(/^pk_(?:test|live)_(.+)$/);
  if (!match) return null;
  try {
    const decoded = atob(match[1]);
    const host = decoded.endsWith("$") ? decoded.slice(0, -1) : decoded;
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}

/** The Convex client's origins: https and wss for a cloud deployment, http and ws for a local one. */
function convexOrigins(convexUrl: string | undefined): string[] {
  if (!convexUrl) return [];
  try {
    const url = new URL(convexUrl);
    const socket = url.protocol === "https:" ? "wss:" : "ws:";
    return [url.origin, `${socket}//${url.host}`];
  } catch {
    return [];
  }
}

export function contentSecurityPolicy(opts: { convexUrl?: string; clerkPublishableKey?: string; dev: boolean }): string {
  const clerkHost = clerkFrontendHost(opts.clerkPublishableKey);
  const clerk = [
    ...(clerkHost ? [`https://${clerkHost}`] : []),
    // Development keys can talk to Clerk's shared development hosts too.
    ...(opts.clerkPublishableKey?.startsWith("pk_test_") ? ["https://*.clerk.accounts.dev"] : []),
  ];
  const turnstile = "https://challenges.cloudflare.com"; // Clerk's bot check
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", "'unsafe-inline'", ...(opts.dev ? ["'unsafe-eval'"] : []), ...clerk, turnstile]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https://img.clerk.com", ...clerk]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'", ...convexOrigins(opts.convexUrl), ...clerk, "https://clerk-telemetry.com"]],
    ["frame-src", ["'self'", turnstile, ...clerk]],
    ["worker-src", ["'self'", "blob:"]],
    ["frame-ancestors", ["'none'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
  ];
  return directives.map(([name, sources]) => `${name} ${sources.join(" ")}`).join("; ");
}
