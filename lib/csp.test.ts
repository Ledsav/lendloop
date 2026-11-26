import { describe, expect, test } from "vitest";
import { clerkFrontendHost, contentSecurityPolicy } from "./csp";

const devKey = `pk_test_${btoa("civil-quail-8431.clerk.accounts.dev$")}`;
const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("content security policy", () => {
  test("Clerk's frontend host comes from the publishable key", () => {
    expect(clerkFrontendHost(devKey)).toBe("civil-quail-8431.clerk.accounts.dev");
    expect(clerkFrontendHost(`pk_live_${btoa("clerk.example.com$")}`)).toBe("clerk.example.com");
    expect(clerkFrontendHost(undefined)).toBeNull();
    expect(clerkFrontendHost("nonsense")).toBeNull();
  });

  test("a cloud Convex deployment over https and wss", () => {
    const csp = contentSecurityPolicy({ convexUrl: "https://dynamic-hawk-467.convex.cloud", clerkPublishableKey: devKey, dev: false });
    const connect = directive(csp, "connect-src");
    expect(connect).toContain("https://dynamic-hawk-467.convex.cloud");
    expect(connect).toContain("wss://dynamic-hawk-467.convex.cloud");
    expect(connect).toContain("https://civil-quail-8431.clerk.accounts.dev");
  });

  test("a local Convex backend over http and ws (laptop or codespace)", () => {
    const connect = directive(contentSecurityPolicy({ convexUrl: "http://127.0.0.1:3210", clerkPublishableKey: devKey, dev: true }), "connect-src");
    expect(connect).toContain("http://127.0.0.1:3210");
    expect(connect).toContain("ws://127.0.0.1:3210");
  });

  test("eval only in development", () => {
    expect(directive(contentSecurityPolicy({ dev: true, clerkPublishableKey: devKey }), "script-src")).toContain("'unsafe-eval'");
    expect(directive(contentSecurityPolicy({ dev: false, clerkPublishableKey: devKey }), "script-src")).not.toContain("'unsafe-eval'");
  });

  test("Clerk's scripts, images and bot check are allowed; framing and plugins are not", () => {
    const csp = contentSecurityPolicy({ convexUrl: "https://x.convex.cloud", clerkPublishableKey: devKey, dev: false });
    expect(directive(csp, "script-src")).toContain("https://*.clerk.accounts.dev");
    expect(directive(csp, "script-src")).toContain("https://cdn.protect.clerk.com"); // Clerk's fraud protection
    expect(directive(csp, "connect-src")).toContain("https://*.protect.clerk.com");
    expect(directive(csp, "frame-src")).toContain("https://challenges.cloudflare.com");
    expect(directive(csp, "img-src")).toContain("https://img.clerk.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("default-src 'self'");
  });
});
