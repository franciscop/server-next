import formidable from "formidable";

export default async (ctx) => {
  // These cannot have a body at all, so don't even attempt it
  if (ctx.method === "GET" || ctx.method === "DELETE") return;

  // Extensions by default are nice
  const form = new formidable.IncomingForm({ keepExtensions: true });

  await new Promise((done, fail) => {
    form.parse(ctx.req, (err, fields, files) => {
      if (err) fail(err);
      ctx.body = fields;
      ctx.files = {};
      for (let file in files) {
        ctx.files[file] = {
          path: files[file].path,
          name: files[file].name,
          type: files[file].type,
          size: files[file].size,
          modified: files[file].lastModifiedDate,
        };
      }
      done();
    });
  });
};
