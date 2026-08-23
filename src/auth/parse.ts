import type { AuthEntry, AuthOption, Context, Options } from "../types";
import { entry as flowEntry } from "./flow";
import { entry as verifyEntry } from "./verify";
import VENDORS from "./vendors";

// Every shape of `auth` normalises to the same thing: resolve a user, and
// optionally own routes. See docs/5. Authentication.md.
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

// A vendor ran the login itself, so the strategy only says where their token
// rides: `jwt:` for `Authorization: Bearer`, `cookie:` for the cookie their
// SDK sets on a same-origin app. The tenant's issuer and audience differ per
// account, so they come from the environment by name.
function vendorEntry(strategy: string, name: string): AuthEntry {
  const vendor = VENDORS[name];
  const KEY = name.toUpperCase();

  if (strategy !== "jwt" && strategy !== "cookie") {
    throw new Error(
      `"${strategy}:${name}" is not possible: ${name} issues a signed token, ` +
        `and "${strategy}" means an opaque id resolved through a \`getUser\` ` +
        `of yours. Use "jwt:${name}", or "cookie:${name}" for a same-origin app.`,
    );
  }
  if (strategy === "cookie" && !vendor.cookie) {
    throw new Error(
      `"cookie:${name}" is not possible: ${name} does not store its token in ` +
        `a cookie with a fixed name. Use "jwt:${name}", or name the cookie ` +
        `yourself with { verify, audience, cookie }.`,
    );
  }

  const issuer = globalThis.env[`${KEY}_ISSUER`];
  if (!issuer) {
    throw new Error(
      `${KEY}_ISSUER is not set, and it differs per account, so it cannot be ` +
        `guessed. See ${vendor.docs}`,
    );
  }
  const audience = globalThis.env[`${KEY}_AUDIENCE`];
  if (!audience) {
    throw new Error(
      `${KEY}_AUDIENCE is not set. It should be ${vendor.audience}. One issuer ` +
        `serves many applications, all signed with the same keys, so without ` +
        `it a token minted for another one is accepted here.`,
    );
  }

  return verifyEntry({
    issuer,
    audience,
    ...(vendor.claim ? { audienceClaim: vendor.claim } : {}),
    ...(strategy === "cookie" ? { cookie: vendor.cookie } : {}),
  });
}

function toEntry(auth: AuthOption): AuthEntry {
  // `<strategy>:<name>`, with no callbacks, so there is no database
  if (typeof auth === "string") {
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

  if (typeof auth === "function") {
    return { name: "function", user: async (ctx: Context) => auth(ctx as any) };
  }

  if (auth && typeof auth === "object") {
    if ("issuer" in auth) return verifyEntry(auth as any);
    if ("providers" in auth) return flowEntry(auth as any);
    // A library that runs its own handshake and serves its own routes
    if ("handler" in auth) {
      const instance = auth as any;
      const path = (instance.path ?? "/api/auth").replace(/\/$/, "");
      // A true passthrough: `parser: 'stream'` leaves the body unread, so the
      // library gets the exact bytes it signs and parses itself
      const raw = { parser: "stream" as const };
      const forward = (ctx: Context) =>
        instance.handler(
          new Request(ctx.url.href, {
            method: ctx.method,
            headers: ctx.headers as Record<string, string>,
            body: ctx.body as ReadableStream | undefined,
            // Required by fetch whenever a body is a stream
            ...(ctx.body ? { duplex: "half" } : {}),
          } as RequestInit),
        );
      return {
        name: `instance:${path}`,
        user: async (ctx: Context) => instance.user?.(ctx),
        routes: (app) => {
          const wildcard = `${path}/*`;
          app.get(wildcard, raw, forward);
          app.post(wildcard, raw, forward);
          app.put(wildcard, raw, forward);
          app.patch(wildcard, raw, forward);
          app.delete(wildcard, raw, forward);
        },
      };
    }
  }

  throw new Error(
    "Invalid `auth`: it takes a string, a function, `{ providers }`, " +
      "`{ issuer, audience }`, a library instance, or an array of those.",
  );
}
