import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Signed-out visitors only see the public page. This is a convenience redirect: the real checks
// are in the Convex functions, which verify the Clerk token on every call.
const isAppRoute = createRouteMatcher(["/tools(.*)", "/listings(.*)", "/requests(.*)", "/incoming(.*)", "/admin(.*)", "/account(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isAppRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
