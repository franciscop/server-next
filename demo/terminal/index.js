import server from "../../";

const rows = [
  // {
  //   method: "get",
  //   path: "/users/345",
  //   status: 200,
  //   reqSize: 0,
  //   resSize: 240,
  //   type: "html",
  //   time: 126,
  // },
  // {
  //   method: "options",
  //   path: "/products/4t5435/details/3245435",
  //   status: 200,
  //   reqSize: 0,
  //   resSize: 4652,
  //   type: "json",
  //   time: 2453,
  // },
  // {
  //   method: "patch",
  //   path: "/products/4t5435/",
  //   status: 301,
  //   reqSize: 12344,
  //   resSize: 56233325,
  //   type: "text",
  //   time: 24,
  // },
  // {
  //   method: "get",
  //   path: "/products/dfgfdgdfgdf/",
  //   status: 404,
  //   reqSize: 0,
  //   resSize: 25,
  //   type: "html",
  //   time: 5,
  // },
];

const padDim = (str, len, char = "·") => {
  if (str.length >= len) return str;
  str = str + " ";
  return str + "\x1b[2m" + "".padEnd(len - str.length, char) + "\x1b[0m";
};
const padStartDim = (str, len, char = "·") => {
  if (str.length >= len) return str;
  str = str;
  return "\x1b[2m" + "".padEnd(len - str.length, char) + "\x1b[0m" + str;
};

const roundBytes = (b) => {
  if (b > 1e6 * 100) return Math.round(b / 1e6) + "m";
  if (b > 1e6) return (b / 1e6).toFixed(1) + "m";
  if (b > 1e3 * 100) return Math.round(b / 1e3) + "k";
  if (b > 1e3) return (b / 1e3).toFixed(1) + "k";
  if (b > 0) return b + "b";
  return "-";
};

const render = () => {
  const size = process.stdout.columns ? process.stdout.columns - 4 : 80;
  const methodSize = 7;
  const pathSize = 30;
  const sizeSize = 5;
  const statusSize = 3;
  const typeSize = 6;
  const timeSize = 7;
  process.stdout.write("\x1Bc"); // RESET
  const totalSize =
    methodSize +
    2 +
    pathSize +
    2 +
    sizeSize +
    9 +
    statusSize +
    2 +
    typeSize +
    2 +
    sizeSize +
    2 +
    timeSize;
  const r = (text, char = " ") => text.padEnd(size, char);

  const printError = (err) => err.message;

  const printableRows = rows.map((row) => {
    const method = row.method.toUpperCase().padEnd(methodSize);
    let path = row.path || "/";
    if (path.length > pathSize) path = path.slice(0, pathSize - 1) + "…";
    path = padDim(path, pathSize);
    const reqSize = padStartDim(roundBytes(row.reqSize), sizeSize, " ");
    let status = row.status;
    const statusColor =
      status < 300 ? "\x1b[32m" : status < 400 ? "\x1b[33m" : "\x1b[31m";
    status = statusColor + status + "\x1b[0m";
    const type = row.type.padEnd(typeSize);
    const resSize = padStartDim(roundBytes(row.resSize), sizeSize, " ");
    const time = (
      (row.time > 10 ? Math.round(row.time) : row.time) + "ms"
    ).padStart(timeSize, " ");
    const text = `${method}  ${path}  ${reqSize}    ➤    ${status}  ${type}  ${resSize}  ${time}`;
    const error = row.error
      ? `│\x1b[31m╭─${r("", "─").slice(0, -1)}╮\x1b[0m│\n` +
        row.error.stack
          .split("\n")
          .map((line) => `│\x1b[31m│ ${r(line.trim()).slice(0, -1)}│\x1b[0m│`)
          .join("\n") +
        `│\x1b[31m╰─${r("", "─").slice(0, -1)}╯\x1b[0m│`
      : "";
    return { text, error };
  });

  if (!printableRows.length) {
    return console.log(`╭─${r(" http://localhost:3000/ ", "─")}─╮
│ ${r(` `)} │
│  \x1b[2m${r(`Requests will appear here`)}\x1b[0m│
│ ${r(` `)} │
╰─${r("", "─")}─╯
`);
  }

  return console.log(`╭─${r(" http://localhost:3000/ ", "─")}─╮
│ ${r(` `)} │
│  ${`${"METHOD".padEnd(methodSize)}  ${"PATH".padEnd(pathSize)}  ${"BODY".padStart(sizeSize)}        STAT  ${"TYPE".padEnd(typeSize)}  ${"BODY".padStart(sizeSize)}  ${"TIME".padStart(timeSize)}`.padEnd(size, " ")}│
│ ${r(` `)} │
${printableRows.map((row) => `│  ${row.text}${"".padEnd(size - totalSize, " ")}│` + row.error).join("\n")}
│ ${r(` `)} │
╰─${r("", "─")}─╯
`);
};

render();

const logger = (ctx) => {
  ctx.unstableOn("finish", async (e) => {
    rows.push({
      method: ctx.method,
      path: ctx.url.pathname,
      status: e.res.status,
      reqSize: e.headers["content-length"] || 0,
      error: e.error,
      type: (e.res.headers.get("content-type") || "plain/text")
        .split(";")[0]
        .split("/")[1],
      resSize: (await e.res.clone().arrayBuffer()).byteLength,
      time: Math.round(100 * (e.end - e.init)) / 100,
    });
    render();
  });
};

export default server()
  .use(logger)
  .get(
    "/",
    () => `<!DOCTYPE html>
    <html>
      <body>
        <a href="/html">HTML</a>
        <a href="/obj">Object</a>
        <a href="/error">Error</a>
      </body>
    </html>`,
  )
  .get("/html", () => "<div>Hello world</div>")
  .get("/obj", () => ({ hello: "world" }))
  .get("/error", () => {
    throw new Error("This is an error!");
  });
