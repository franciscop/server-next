import parseUrl from "../helpers/parseUrl.js";

const runtime = "node";

const getUrl = ({ protocol = "http", headers, url = "/" }) => {
  return protocol + "://" + headers["host"] + url;
};

// https://stackoverflow.com/a/19524949/938236
const getIp = req => {
  return (
    (req.headers["x-forwarded-for"] || "").split(",").pop() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress
  );
};

// Launch the server for the Node.js environment
export default async (handler, options = {}) => {
  const http = await import("http");
  const server = http.createServer(async (req, res) => {
    const ip = getIp(req);
    const url = getUrl(req);
    const ctx = {
      ...parseUrl(req.url),
      url,
      method: req.method,
      headers: req.headers,
      req,
      runtime,
      ip
    };
    const reply = await handler(ctx);
    const { status = 200, body, headers = {} } = reply;
    res.statusCode = status;
    for (let key in headers) {
      res.setHeader(key, headers[key]);
    }
    res.write(body);
    res.end();
  });

  return new Promise((resolve, reject) => {
    server.listen(options.port, error => {
      if (error) reject(error);
      resolve({ options, handler, runtime, close: () => server.close() });
    });
  });
};
