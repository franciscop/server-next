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
  const { createServer } = await import("http");

  const server = createServer(async (req, res) => {
    // Handle each of the API calls here:
    const reply = await handler({
      url: getUrl(req),
      method: req.method,
      headers: req.headers,
      ip: getIp(req),
      runtime,
      req
    });

    res.statusCode = reply.status || 200;
    for (let key in reply.headers) {
      res.setHeader(key, reply.headers[key]);
    }
    res.write(reply.body);
    res.end();
  });

  return new Promise((resolve, reject) => {
    server.listen(options.port, error => {
      if (error) reject(error);
      resolve({ options, handler, runtime, close: () => server.close() });
    });
  });
};
