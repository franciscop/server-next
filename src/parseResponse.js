import { cors, createId } from "./helpers/index.js";
import { json } from "./reply.js";
import ServerError from "./ServerError.js";

export default async function parseResponse(out, ctx) {
  // undefined || null || 0 || false || ~""~ -> empty string is still 200
  if (!out && typeof out !== "string") return null;

  if (typeof out === "function") {
    out = await out(ctx);
  }

  if (out instanceof Blob) {
    out = new Response(out, { headers: { "Content-Type": blob.type } });
  }

  if (out instanceof ReadableStream) {
    out = new Response(out);
  }

  // A plain number is a status code
  if (typeof out === "number") {
    out = new Response(undefined, { status: out });
  }

  // A plain string will be converted to either html or plain
  if (typeof out === "string") {
    const type = /^\s*\</.test(out) ? "text/html" : "text/plain";
    out = new Response(out, { headers: { "content-type": type } });
  }

  // https://stackoverflow.com/a/69745650/938236
  if (out?.constructor === Object || Array.isArray(out)) {
    out = json(out);
  }

  // The output from fetch(), create a copy of it into a new response
  if (out instanceof Response && out.url && out.body) {
    out = new Response(out.body, {
      status: 200,
      headers: out.headers,
    });
    if (/^(br|gzip)$/.test(out.headers.get("content-encoding"))) {
      console.warn("Compression not yet supported for response");
      out.headers.delete("content-encoding");
    }
  }

  if (!(out instanceof Response)) {
    throw new Error(`Invalid response type ${out}`);
  }

  // Here it should be a Response

  // If we have CORS, set it up
  if (ctx.options.cors) {
    // Set the proper CORS headers
    const origin = cors(ctx.options.cors.origin, ctx.headers.origin);
    if (origin) {
      out.headers.set("Access-Control-Allow-Origin", origin);
      out.headers.set("Access-Control-Allow-Methods", ctx.options.cors.methods);
      out.headers.set("Access-Control-Allow-Headers", ctx.options.cors.headers);
      if (ctx.options.cors.credentials) {
        out.headers.set("Access-Control-Allow-Credentials", "true");
      }
    }
  }

  // Only attach the headers if the user is using the timing API
  // 1 item is the `init` so it doesn't count
  if (ctx.time.times.length > 1) {
    out.headers.set("Server-Timing", ctx.time.headers());
  }

  // If we have a session, we need to persist it into a cookie
  if (Object.keys(ctx.session || {}).length) {
    if (!ctx.options.session?.store) {
      throw ServerError.NO_STORE({});
    }

    // Persistence is based on the Token
    // Persistence is based on the Cookies
    // No session cookies, generate a _persistent_ cookie
    if (!ctx.cookies.session) {
      ctx.res.cookies.session = createId();
    }
    const id = ctx.cookies.session;

    // Saves the session in the session store
    // Note that this is async but we are totally fine deferring it
    ctx.options.session.store.set(id, ctx.session);
  }

  // Cookies to headers
  if (ctx.options.cookies) {
    if (Object.keys(ctx.res.cookies).length) {
      for (const cookie of ctx.res.cookies) {
        ctx.res.headers.append("set-cookie", cookie);
      }
    }
  }

  // Add the headers that are neeeded
  if (ctx?.res?.headers) {
    for (const key in ctx.res.headers) {
      out.headers[key] = ctx.res.headers[key];
    }
  }

  return out;
}
