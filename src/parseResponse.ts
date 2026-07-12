import {
  applyCache,
  applyCors,
  applySecurity,
  createCookies,
  createId,
  iteratorAsyncToReadable,
  iteratorToReadable,
} from "./helpers";
import { json } from "./reply";
import ServerError from "./ServerError";

import type { Context } from ".";

export default async function parseResponse(
  out: any,
  ctx: Context,
): Promise<Response | null> {
  if (!out && typeof out !== "string") return null;

  if (typeof out === "function") {
    out = await out(ctx);
  }

  // A bare Reply — e.g. `return status(401)` with no terminal `.send()`/`.json()`
  // — is finalized by sending an empty body, keeping the status and headers it
  // set. Chainable helpers (status/type/headers/cache/cookies/download) all
  // return a Reply, so any of them may be returned directly.
  if (out && typeof out.send === "function" && out.res?.headers instanceof Headers) {
    out = out.send();
  }

  if (out instanceof Blob) {
    out = new Response(out, { headers: { "Content-Type": out.type } });
  }

  if (out instanceof ReadableStream) {
    out = new Response(out);
  }

  // A Buffer / typed array is sent as-is (raw bytes), e.g. a `raw` body echoed
  // back. Caught here so it doesn't fall through to the byte-iterator branch.
  if (out instanceof Uint8Array) {
    out = new Response(out as BodyInit);
  }

  // A plain number is a status code
  if (typeof out === "number") {
    out = new Response(undefined, { status: out });
  }

  // A plain string will be converted to either html or plain
  if (typeof out === "string") {
    const type = /^\s*</.test(out) ? "text/html" : "text/plain";
    out = new Response(out, {
      headers: {
        "content-type": type,
        "content-length": String(Buffer.byteLength(out)),
      },
    });
  }

  // https://stackoverflow.com/a/69745650/938236
  if (out?.constructor === Object || Array.isArray(out)) {
    out = json(out);
  }

  // Sync and Async iterators
  if (out[Symbol.iterator]) {
    out = new Response(iteratorToReadable(out));
  }

  // The ReadableStream seems to be an asyncIterator, but we don't want to handle that yet
  if (out[Symbol.asyncIterator] && !(out instanceof Response)) {
    out = new Response(iteratorAsyncToReadable(out));
  }

  // The output from fetch(), create a copy of it into a new response
  if (out instanceof Response && out.url && out.body) {
    out = new Response(out.body, {
      status: out.status,
      headers: out.headers,
    });

    // Compression not supported for streaming response, stripping header
    if (/^(br|gzip)$/.test(out.headers.get("content-encoding") || "")) {
      out.headers.delete("content-encoding");
    }
  }

  if (!(out instanceof Response)) {
    throw new Error(`Invalid response type ${out}`);
  }

  // Here it should be a Response

  // If we have CORS, set the proper headers up
  applyCors(out, ctx);

  // Secure-by-default response headers (X-Frame-Options, nosniff, HSTS, ...)
  applySecurity(out, ctx);

  // Cache-Control default (route/global `cache`) + auto-ETag with a 304
  // short-circuit. May rebuild `out`, so it runs before session/cookie headers
  // are appended below (those land on the response we actually return).
  out = await applyCache(out, ctx);

  // Only attach the headers if the user is using the timing API
  // 1 item is the `init` so it doesn't count
  if (ctx.time?.times?.length > 1) {
    out.headers.set("Server-Timing", ctx.time.headers());
  }

  // If we have a session, we need to persist it into a cookie
  if (Object.keys(ctx.session || {}).length) {
    // TODO: remove, not the right layer
    if (!ctx.options.session?.store) {
      throw ServerError.NO_STORE();
    }

    // Reuse the incoming session cookie, or mint a new id. The SAME id must be
    // used both for the Set-Cookie and the store key, or a fresh session is
    // saved under a key the next request can never look up.
    let id = ctx.cookies.session;
    if (!id) {
      id = createId();
      // Harden the session cookie: JS can't read it (HttpOnly), it isn't sent
      // over plain HTTP in production (Secure), and it's SameSite=Lax.
      out.headers.append(
        "set-cookie",
        createCookies("session", {
          value: id,
          path: "/",
          httpOnly: true,
          secure: ctx.platform.production,
          sameSite: "Lax",
        }),
      );
    }

    // Saves the session in the session store
    // Note that this is async but we are totally fine deferring it
    ctx.options.session.store.set(id, ctx.session);
  }

  // Cookies to headers
  if (ctx.options.cookies) {
    if (Object.keys(ctx.res?.cookies || {}).length) {
      for (const cookie of Object.values(ctx.res.cookies)) {
        ctx.res.headers.append("set-cookie", cookie);
      }
    }
  }

  // Add the headers that are needed
  if ((ctx as any)?.res?.headers) {
    for (const key in ctx.res.headers) {
      out.headers[key] = ctx.res.headers[key];
    }
  }

  return out;
}
