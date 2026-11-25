import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
