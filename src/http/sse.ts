import type { Context } from "../types";

export type SseSend = {
  (data: unknown): void;
  (event: string, data: unknown): void;
};

// Returns the cleanup to run once the client is gone, or nothing
export type SseStart = (
  send: SseSend,
) => void | (() => unknown) | Promise<void | (() => unknown)>;

// Under a minute, so proxies that drop quiet connections (nginx at 60s,
// Cloudflare at 100s) never see one
const PING = 15_000;

const encoder = new TextEncoder();

function format(event: string | undefined, data: unknown): string {
  if (event !== undefined && /[\r\n]/.test(event)) {
    throw new Error(`An SSE event name cannot have line breaks: "${event}"`);
  }
  const text = typeof data === "string" ? data : (JSON.stringify(data) ?? "");
  let out = event === undefined ? "" : `event: ${event}\n`;
  for (const line of text.split(/\r\n|\r|\n/)) out += `data: ${line}\n`;
  return `${out}\n`;
}

// What parseResponse needs to finish wiring a stream it did not create:
// closing it when the request aborts, and lifting the runtime's idle timeout
const streams = new WeakMap<Response, () => void>();

// The runtime's per-request idle timeout (Bun's `server.timeout`), when it has one
const timeouts = new WeakMap<object, (seconds: number) => void>();

export function setTimeoutControl(
  ctx: object,
  timeout?: (seconds: number) => void,
): void {
  if (timeout) timeouts.set(ctx, timeout);
}

export function createSse(start: SseStart, init: ResponseInit): Response {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;
  let cleanup: (() => unknown) | undefined;

  const run = (fn?: () => unknown) => {
    if (typeof fn !== "function") return;
    Promise.resolve()
      .then(fn)
      .catch((error) => console.error("[server:error] sse cleanup:", error));
  };

  const write = (chunk: string) => {
    if (closed) return;
    try {
      controller.enqueue(encoder.encode(chunk));
    } catch {
      // The stream was torn down underneath us; nothing left to write to
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(ping);
    try {
      controller.close();
    } catch {
      // Already closed or cancelled
    }
    run(cleanup);
  };

  const fail = (error: unknown) => {
    console.error("[server:error] sse:", error);
    close();
  };

  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel: close,
  });

  const ping = setInterval(() => write(": ping\n\n"), PING);

  const send = ((...args: unknown[]) => {
    const [event, data] =
      args.length > 1 ? [args[0] as string, args[1]] : [undefined, args[0]];
    write(format(event, data));
  }) as SseSend;

  try {
    const result = start(send);
    Promise.resolve(result).then((fn) => {
      // Left before an async start finished: its cleanup is still owed
      if (closed) run(fn ?? undefined);
      else cleanup = fn ?? undefined;
    }, fail);
  } catch (error) {
    fail(error);
  }

  const res = new Response(body, init);
  streams.set(res, close);
  return res;
}

// Called by parseResponse with the context the stream is answering
export function wireSse(res: Response, ctx: Context): void {
  const close = streams.get(res);
  if (!close) return;
  timeouts.get(ctx)?.(0);
  if (ctx.signal.aborted) return close();
  ctx.signal.addEventListener("abort", close, { once: true });
}
