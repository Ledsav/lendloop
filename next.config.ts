import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./lib/csp";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy({
      convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
      clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      dev: process.env.NODE_ENV !== "production",
    }),
  },
  // Browsers stick to HTTPS for this site for two years (production only: local dev is plain http).
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

// GitHub Codespaces only. The browser uses the forwarded host (<codespace>-3000.app.github.dev);
// GitHub's port forwarding passes it in x-forwarded-host but rewrites the Origin header to
// localhost:3000. Next would block dev assets and reject Server Actions (Clerk calls one after
// sign-in) as cross-origin. Trust exactly this codespace's host and that rewritten origin, and only
// inside a codespace: no wildcards, nothing changes anywhere else.
const codespaceHost = process.env.CODESPACE_NAME
  ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "app.github.dev"}`
  : undefined;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(codespaceHost && {
    allowedDevOrigins: [codespaceHost],
    experimental: { serverActions: { allowedOrigins: ["localhost:3000"] } },
  }),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
