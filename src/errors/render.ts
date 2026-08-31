import type { Context } from "../types";

const DOCS = "https://server-js.com/documentation/errors";

// A browser asks for HTML; anything else (fetch, curl, an SDK) gets the plain
// body it can parse, even in development
const wantsHtml = (ctx: Context): boolean =>
  String(ctx?.headers?.accept || "").includes("text/html");

const escapeHtml = (str: string) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Codes are ours and look like UPLOAD_TOO_LARGE, but an app can register its
// own, so anything that is not one is neither linked nor put in an attribute.
const safeCode = (code: unknown): string | null =>
  typeof code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(code) ? code : null;

// `code` in a hint is written as `like this`, which reads better rendered
const inline = (str: string) =>
  escapeHtml(str).replace(/`([^`]+)`/g, "<code>$1</code>");

// What the operator needs, whatever the audience: the error itself plus the
// hint that says how to fix it.
function logLines(error: any): string {
  const code = error?.code ? `${error.code}: ` : "";
  const hint = error?.hint ? `\n  ${error.hint}` : "";
  const valid = safeCode(error?.code);
  const docs = valid ? `\n  ${DOCS}#${valid.toLowerCase()}` : "";
  return `${code}${error?.message ?? error}${hint}${docs}`;
}

// The development error page. Production never sees this: it exists so the
// message, the hint and the docs are in front of whoever is building the app,
// instead of in a log they have to go and find.
function devPage(error: any, ctx: Context): string {
  // Coerced, so nothing but a number is ever printed as one
  const status = Number(error?.status) || 500;
  const code = safeCode(error?.code);
  const link = code ? `${DOCS}#${code.toLowerCase()}` : null;
  const title = code ?? error?.name ?? "Error";
  const stack = error?.stack ? escapeHtml(String(error.stack)) : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<title>${status} ${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 3rem 1.5rem; font: 15px/1.6 ui-sans-serif, system-ui, sans-serif; }
  main { max-width: 46rem; margin: 0 auto; }
  .status { font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; opacity: .6; }
  h1 { font-size: 1.5rem; }
  code { font-family: ui-monospace, monospace; font-size: .9em; background: color-mix(in srgb, currentColor 10%, transparent); padding: .1em .3em; border-radius: .2em; }
  pre { overflow-x: auto; font-size: .8rem; opacity: .7; background: light-dark(#eee, #1a1a1a); padding: 1rem; border-radius: .3rem; }
  footer { font-size: .8rem; opacity: .6; margin-top: 2rem; }
</style></head>
<body><main>
  <p class="status">${status}${code ? ` &middot; ${escapeHtml(code)}` : ""} &middot; ${escapeHtml(ctx.method.toUpperCase())} ${escapeHtml(ctx.url.pathname)}</p>
  <h1>${escapeHtml(String(error?.message ?? error))}</h1>
  ${error?.hint ? `<p>${inline(error.hint)}</p>` : ""}
  ${link ? `<p><a href="${link}">${link}</a></p>` : ""}
  ${stack ? `<pre>${stack}</pre>` : ""}
  <footer>You are seeing this because the app is in development. In production this is a plain ${status}.</footer>
</main></body></html>`;
}

// The default onError. A 4xx describes what the client got wrong, so its
// message is theirs to read. A 5xx describes what went wrong here, so it stays
// generic: the real one, its hint and its stack go to the log. In development
// the whole thing is rendered instead, since the only reader is the person
// building the app.
export function defaultOnError(error: any, ctx: Context): Response {
  // Coerced: a thrown value can carry anything as its status, and a bad
  // one must not blow up the handler that exists to answer for it
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error(`[server:error] ${logLines(error)}`);

  if (env.NODE_ENV !== "production" && wantsHtml(ctx)) {
    return new Response(devPage(error, ctx), {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // The page renders a message, a stack and a path, none of which
        // it controls. Nothing may execute or be fetched, so an escaping
        // miss is inert rather than exploitable.
        "content-security-policy":
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      },
    });
  }
  const body = status < 500 ? error?.message : "Server Error";
  return new Response(body || "Server Error", { status });
}
