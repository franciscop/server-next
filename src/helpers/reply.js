// Normalize the reply to return always an object in the same format
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Origin, X-Requested-With, Content-Type, Accept",
  "Access-Control-Allow-Methods": "GET, PUT, PATCH, POST, DELETE, HEAD"
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
    const rest = await data(ctx);
    return { status: 200, headers, ...rest };
  }

  // A plain string response
  if (typeof data === "string") return { body: data, headers, status: 200 };

  // Most basic of error handling, anything higher level should be on user code
  if (data instanceof Error) {
    return { status: data.status || 500, headers, body: data.message };
  }

  // Treat it as a plain object
  return {
    body: JSON.stringify(data),
    status: data.status || 200,
    headers: { ...headers, "content-type": "application/json" }
  };
};
