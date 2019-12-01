import server, { get, post, put } from "../src/index.js";

const store = (data => {
  if (typeof KV !== "undefined") return KV;
  return { get: k => data[k], put: (k, v) => (data[k] = v) };
})({});

const read = async ctx => {
  const data = await store.get(ctx.params.id);
  return JSON.parse(data);
};

const write = async ctx => {
  await store.put(ctx.params.id, JSON.stringify(ctx.body));
  return ctx.params.id;
};

server(
  { port: 3000 },
  get("/:id", read),
  post("/:id", write),
  put("/:id", write)
);
