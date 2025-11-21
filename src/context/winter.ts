import auth from "../auth";
import { define, parseHeaders } from "../helpers";
import parseBody from "./parseBody";
import parseCookies from "./parseCookies";
import type { Context, Server } from "..";
import createEvents from "./createEvents";
import isValidMethod from "./isValidMethod";

export default async function createWinter(
  req: Request,
  app: Server,
): Promise<Context> {
  const init = performance.now();

  const method = req.method.toLowerCase();
  if (!isValidMethod(method)) {
    throw new Error(`Invalid HTTP method: ${method}`);
  }

  const headers = parseHeaders(req.headers);
  const cookies = parseCookies(headers.cookie);

  const baseUrl = req.url.replace(/\/$/, "") || "/";
  const url = new URL(baseUrl) as Context["url"];
  define(url, "query", (url: URL) =>
    Object.fromEntries(url.searchParams.entries()),
  );

  const rawBody = Buffer.from(await req.arrayBuffer());
  const body = req.body
    ? await parseBody(rawBody, headers["content-type"], app.settings.uploads)
    : undefined;

  const events = createEvents();

  return await auth.load({
    options: app.settings,
    platform: app.platform,
    url,
    method,
    body,
    headers,
    cookies,
    init,
    events,
    app,
  });
}
