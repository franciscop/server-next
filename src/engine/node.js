import http from "http";
import zlib from "zlib";

const runtime = "node";

const getUrl = ({ protocol = "http", headers, url = "/" }) => {
  return protocol + "://" + headers["host"] + url;
};

// https://stackoverflow.com/a/19524949/938236
const getIp = (req) => {
  return (
    (req.headers["x-forwarded-for"] || "").split(",").pop() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress
  );
};

// Launch the server for the Node.js environment
export default async (handler, options = {}) => {
  const compress = (data, headers) => {
    // Don't compress it if it's tiny
    if (data.length < 1000) {
      return data;
    }
    headers["Content-Encoding"] = "gzip";
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
    const { status = 200, body = "", headers = {} } = await handler({
      url: getUrl(req),
      method: req.method,
      headers: req.headers,
      ip: getIp(req),
      runtime,
      req,
      options,
    });

    res.statusCode = status;
    const compressed = await compress(body, headers);
    for (let key in headers) {
      // https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_request_setheader_name_value
      // "Use an array of strings here to send multiple headers with the same name"
      res.setHeader(key, headers[key]);
    }

    res.end(compressed);
  });

  return new Promise((resolve, reject) => {
    server.listen(options.port, (error) => {
      if (error) reject(error);
      resolve({ options, handler, runtime, close: () => server.close() });
    });
  });
};
