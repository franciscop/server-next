import server, { ServerError, status } from "../..";

// Every error carries a code, a status, a message and a hint. Open these in a
// browser to see the development error page; curl them to see what a client
// actually receives. See docs/8. Errors.md.
//
//   bun --hot .        then visit http://localhost:3000

const CASES = [
  [
    "/nope",
    "404 NOT_FOUND",
    "no route matched, and no catch-all is registered",
  ],
  ["/boom", "500", "a handler threw: the message never leaves the server"],
  ["/teapot", "418", "your own ServerError, with your own status"],
  ["/files/..%2F..%2F.env", "400 PATH_TRAVERSAL", "a param that climbs out"],
  ["/upload", "413 UPLOAD_TOO_LARGE", "one file over maxFileSize"],
  ["/too-many", "413 UPLOAD_TOO_MANY_FILES", "five files, maxFiles is 3"],
  ["/wrong-type", "415 UPLOAD_TYPE_NOT_ALLOWED", "says image/png, is not one"],
  ["/big-body", "413 BODY_TOO_LARGE", "a plain body over maxBodySize"],
  ["/no-uploads", "500 UPLOAD_NOT_CONFIGURED", "a file with nowhere to go"],
  ["/handled", "200", "caught in the handler, so nothing reaches onError"],
];

const Index = () => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Errors</title>
      <style>{`
        body { margin: 0; padding: 3rem 1.5rem; font: 15px/1.7 ui-sans-serif, system-ui, sans-serif; }
        main { max-width: 44rem; margin: 0 auto; }
        li { margin: .5rem 0; }
        code { font-family: ui-monospace, monospace; font-size: .85em; }
        .what { opacity: .6; }
      `}</style>
    </head>
    <body>
      <main>
        <h1>Errors</h1>
        <p>
          Each link produces one error. In the browser you get the development
          page with its hint; with <code>curl</code> you get what a client sees,
          which for a 5xx is only the status.
        </p>
        <ul>
          {CASES.map(([path, label, what]) => (
            <li>
              <a href={path}>{path}</a> <code>{label}</code>
              <br />
              <span class="what">{what}</span>
            </li>
          ))}
        </ul>
      </main>
    </body>
  </html>
);

// One multipart body, built by hand so a limit can be aimed at precisely
const multipart = (files) => {
  const boundary = "demo-boundary";
  const parts = files.map(
    ({ name = "a.bin", type = "application/octet-stream", body = "x" }) =>
      `--${boundary}\r\nContent-Disposition: form-data; name="f"; ` +
      `filename="${name}"\r\nContent-Type: ${type}\r\n\r\n${body}\r\n`,
  );
  return {
    body: `${parts.join("")}--${boundary}--\r\n`,
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
};

// The links are GETs, but most of these errors need a body, so the app asks
// itself and hands back whatever it answered. No network, no second server.
const ask = (ctx, path, { body, headers }) =>
  app.fetch(
    new Request(`${ctx.url.origin}${path}`, {
      method: "POST",
      body,
      headers: { ...headers, accept: String(ctx.headers.accept || "") },
    }),
  );

const uploads = { bucket: "./uploads", maxFileSize: "1kb", maxFiles: 3 };

export default server({ security: { maxBodySize: "1kb" } })
  .get("/", () => <Index />)

  // No status, so a 500, so the message stays server-side. It is in the log.
  .get("/boom", () => {
    throw new Error("connection to db://admin:hunter2@10.0.0.5 refused");
  })

  // A 4xx of your own: the message describes the client's request, so it is
  // sent to them
  .get("/teapot", () => {
    throw new ServerError("TEAPOT", 418, "I'm a teapot, not a coffee machine");
  })

  // A route param pointing outside where it belongs
  .get("/files/:name", (ctx) => `you asked for ${ctx.url.params.name}`)

  // Refused mid-stream, with nothing left in the bucket
  .get("/upload", (ctx) =>
    ask(
      ctx,
      "/store",
      multipart([{ name: "big.bin", body: "x".repeat(5000) }]),
    ),
  )

  // Each file passes on its own; there are simply too many of them
  .get("/too-many", (ctx) =>
    ask(
      ctx,
      "/store",
      multipart(Array.from({ length: 5 }, (_, i) => ({ name: `a${i}.bin` }))),
    ),
  )

  // The whitelist is checked against the bytes, so a mislabelled file fails
  .get("/wrong-type", (ctx) =>
    ask(
      ctx,
      "/images",
      multipart([{ name: "photo.png", type: "image/png", body: "not a png" }]),
    ),
  )

  // Not a file: a plain body past the in-memory cap
  .get("/big-body", (ctx) =>
    ask(ctx, "/store", {
      body: "x".repeat(5000),
      headers: { "content-type": "text/plain" },
    }),
  )

  // /keep has no `uploads`, so a file arriving there has nowhere to go
  .get("/no-uploads", (ctx) =>
    ask(ctx, "/keep", multipart([{ name: "avatar.png" }])),
  )

  // Caught here, so the default handler never sees it
  .get("/handled", () => {
    try {
      throw new ServerError("WOULD_HAVE_BEEN_500", 500, "not today");
    } catch {
      return status(200).send("caught it, answered normally");
    }
  })

  .post("/store", { uploads }, (ctx) => ctx.body)
  .post(
    "/images",
    { uploads: { ...uploads, fileType: ["image/png"] } },
    (ctx) => ctx.body,
  )
  .post("/keep", (ctx) => ctx.body);
