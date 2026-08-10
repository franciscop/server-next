import {
  applyCache,
  applyCors,
  applySecurity,
  createCookies,
  createId,
  iteratorAsyncToReadable,
  iteratorToReadable,
  mimes,
} from "./helpers";
import fileType from "./helpers/fileType";
import isHtml from "./helpers/isHtml";
import { loaded } from "./middle/session";
import { json } from "./reply";

import type { Context } from ".";

// In-memory sessions vanish on restart and aren't shared across instances;
// warned once, and only when a production app actually writes one
let warned = false;
const warnDefault = () => {
  if (warned) return;
  warned = true;
  console.warn(
    "[server:sessions] Using the default in-memory session store in " +
      "production: sessions are lost on restart and not shared across " +
      "instances. Configure one with sessions: kv(redis).prefix('session:').",
  );
};

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

  // A bucket file handle (from `bucket.file(name)`): stream it back with a
  // content-type guessed from its name, and a 404 when it doesn't exist. Lets a
  // guarded route serve a stored/private file with `return bucket.file(id)`.
  if (
    out &&
    typeof out.stream === "function" &&
    typeof out.bytes === "function" &&
    typeof out.exists === "function" &&
    typeof out.name === "string"
  ) {
    if (!(await out.exists())) {
      out = new Response(null, { status: 404 });
    } else {
      const type = fileType(out);
      out = new Response(
        out.stream(),
        type ? { headers: { "content-type": type } } : undefined,
      );
    }
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
    const type = isHtml(out) ? mimes.html : mimes.text;
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

  // Persist the session only when it changed since it was loaded (the
  // snapshot in `loaded`); an untouched session costs no store write. No entry
  // means this request has no session at all (see middle/session), so nothing
  // is written or minted for it.
  const prev = loaded.get(ctx);
  if (prev && JSON.stringify(ctx.session ?? {}) !== prev.data) {
    if (ctx.options.sessionsDefault && ctx.platform.production) {
      warnDefault();
    }
    // Reuse the id the session was loaded under (login rotates it), or mint a
    // new one. The SAME id must be used both for the Set-Cookie and the store
    // key, or a fresh session is saved under a key the next request can never
    // look up.
    let id = prev.id;
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

    // Note that this is async but we are totally fine deferring it
    ctx.options.sessions.set(id, ctx.session);
  }

  // Add the headers that are needed
  if ((ctx as any)?.res?.headers) {
    for (const key in ctx.res.headers) {
      out.headers[key] = ctx.res.headers[key];
    }
  }

  return out;
}
