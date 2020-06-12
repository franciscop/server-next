// Node native body parser
const parseBody = async (req) => {
  return new Promise((done, fail) => {
    const type = req.headers["content-type"];
    const parser = /application\/json/.test(type)
      ? (data) => JSON.parse(data)
      : (data) => data;
    const data = [];
    req
      .on("data", (chunk) => {
        data.push(chunk);
      })
      .on("end", () => {
        const raw = Buffer.concat(data).toString();
        try {
          done(parser(raw));
        } catch (error) {
          fail(error);
        }
      })
      .on("error", fail);
  });
};

// Cloudflare body parser as https://developers.cloudflare.com/workers/templates/snippets/post_data/
async function readRequestBody(request) {
  const { headers } = request;
  const contentType = headers.get("content-type") || "text/html";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    return JSON.stringify(body);
  } else if (contentType.includes("application/text")) {
    const body = await request.text();
    return body;
  } else if (contentType.includes("text/html")) {
    const body = await request.text();
    return body;
  } else if (contentType.includes("form")) {
    const formData = await request.formData();
    let body = {};
    for (let entry of formData.entries()) {
      body[entry[0]] = entry[1];
    }
    return JSON.stringify(body);
  } else {
    let myBlob = await request.blob();
    var objectURL = URL.createObjectURL(myBlob);
    return objectURL;
  }
}

export default async (ctx) => {
  // No parsing for now
  if (!ctx.req) return;

  // Parsing it out of the request's text() method
  if (ctx.req.text) {
    ctx.body = await readRequestBody(ctx.req);
    return;
  }
  ctx.body = await parseBody(ctx.req);
};
