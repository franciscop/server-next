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
  const [http, zlib] = await Promise.all([import("http"), import("zlib")]);

  const compress = data => {
    return new Promise((done, fail) => {
      const buffer = Buffer.from(data || "", "utf-8");
      zlib.gzip(buffer, (error, result) => {
        if (error) return fail(error);
        return done(result);
      });
    });
  };

  const server = http.createServer(async (req, res) => {
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

    res.setHeader("Content-Encoding", "gzip");

    const comp = await compress(reply.body);
    res.end(comp);
  });

  return new Promise((resolve, reject) => {
    server.listen(options.port, error => {
      if (error) reject(error);
      resolve({ options, handler, runtime, close: () => server.close() });
    });
  });
};
