// Normalize the reply to return always an object in the same format
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, Origin, X-Requested-With, Content-Type, Accept",
  "Access-Control-Allow-Methods": "GET, PUT, PATCH, POST, DELETE, HEAD",
};

// https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_request_setheader_name_value
// "Use an array of strings here to send multiple headers with the same name"
const generateCookies = (cookies) => {
  return Object.entries(cookies).map((p) => p.join("="));
};

export default async (handler, ctx) => {
  const data = await handler(ctx);
  const headers = {};
  if (ctx.options.cors === true) {
    for (let key in cors) {
      headers[key] = cors[key];
    }
    // Quick reply for the OPTIONS CORS
    if (ctx.method === "OPTIONS") {
      return { body: "", headers, status: 200 };
    }
  }

  // Did no throw, but did not resolve === not found
  if (!data) return { body: "Not found", headers, status: 404 };

  // The function means the hanlder knows what it's doing and wants a raw reply
  if (typeof data === "function") {
    const reply = await data(ctx);
    if (reply.cookies) {
      headers["set-cookie"] = generateCookies(reply.cookies);
    }
    return { ...reply, status: 200, headers: { ...reply.headers, ...headers } };
  }

  // A plain string response
  if (typeof data === "string") return { body: data, headers, status: 200 };

  // A status number response
  if (typeof data === "number") return { body: "", headers, status: data };

  // Most basic of error handling, anything higher level should be on user code
  if (data instanceof Error) {
    console.error(data);
    return { status: data.status || 500, headers, body: data.message };
  }

  // Treat it as a plain object
  return {
    body: JSON.stringify(data),
    status: data.status || 200,
    headers: { ...headers, "content-type": "application/json" },
  };
};
