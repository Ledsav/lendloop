import { convexTest } from "convex-test";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";

export const TODAY = "2026-06-10";

export async function setup() {
  const t = convexTest(schema, modules);
  const signIn = async (name: string) => {
    const email = `${name.toLowerCase()}@example.com`;
    const as = t.withIdentity({ subject: name, issuer: "https://clerk.example.test", email, givenName: name, name: `${name} Example` });
    await as.mutation(api.users.store, {});
    return as;
  };
  const alice = await signIn("Alice"); // lender
  const bob = await signIn("Bob"); // borrower
  const carol = await signIn("Carol"); // another neighbor
  const admin = await signIn("Ada");
  await t.mutation(internal.users.setRole, { email: "ada@example.com", role: "admin" });
  return { t, alice, bob, carol, admin };
}

export type Client = Awaited<ReturnType<typeof setup>>["alice"];

export async function listDrill(alice: Client, name = "Cordless drill") {
  return await alice.mutation(api.tools.create, {
    name,
    category: "power tools",
    condition: "good",
    description: "18V, two batteries.",
  });
}
