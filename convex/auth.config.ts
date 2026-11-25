import type { AuthConfig } from "convex/server";

// Convex verifies the Clerk session token (issuer and aud "convex", from Clerk's Convex integration)
// on every request; functions read the identity with ctx.auth.getUserIdentity().
// CLERK_JWT_ISSUER_DOMAIN is set on the Convex deployment.
export default {
  providers: [{ domain: process.env.CLERK_JWT_ISSUER_DOMAIN!, applicationID: "convex" }],
} satisfies AuthConfig;
