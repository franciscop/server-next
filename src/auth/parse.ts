import type { AuthEntry, AuthOption, Context, Options } from "../types";
import flowEntry from "./flow";
import instanceEntry from "./instance";
import vendorEntry, { VENDORS } from "./vendors";
import verifyEntry from "./verify";

// Every shape of `auth` normalises to the same thing: resolve a user, and
// optionally own routes. Each shape's entry lives in its own file; this one
// only decides which shape it is. See docs/5. Authentication.md.
export default function parseAuth(auth: Options["auth"]): AuthEntry | null {
  if (!auth) return null;
  if (Array.isArray(auth)) {
    throw new Error(
      "`auth` takes one method. For several login options, list them under " +
        "`providers` instead: auth: { providers: ['github', 'google'], ... }.",
    );
  }
  return toEntry(auth as AuthOption);
}

// `<strategy>:<name>`, with no callbacks, so there is no database. The name is
// either a vendor whose tokens we check, or a provider we log people in with.
function fromString(auth: string): AuthEntry {
  const [strategy, name] = auth.split(":");
  if (!name) {
    throw new Error(
      `Invalid auth "${auth}": the string form is "<strategy>:<name>", ` +
        'like "cookie:github" to log people in, or "jwt:clerk" to check a ' +
        "token a vendor issued.",
    );
  }
  if (VENDORS[name]) return vendorEntry(strategy, name);
  return flowEntry({ strategy, providers: name } as any);
}

function toEntry(auth: AuthOption): AuthEntry {
  if (typeof auth === "string") return fromString(auth);
  if (typeof auth === "function") {
    return { name: "function", user: async (ctx: Context) => auth(ctx as any) };
  }
  if (auth && typeof auth === "object") {
    if ("issuer" in auth) return verifyEntry(auth as any);
    if ("providers" in auth) return flowEntry(auth as any);
    if ("handler" in auth) return instanceEntry(auth);
  }
  throw new Error(
    "Invalid `auth`: it takes a string, a function, `{ providers }`, " +
      "`{ issuer, audience }`, a library instance, or an array of those.",
  );
}
