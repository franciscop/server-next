export default function cors(headers, options, ctx) {
  headers.set("Access-Control-Allow-Methods", options.methods);
  headers.set("Access-Control-Allow-Headers", options.headers);

  const origin = ctx.headers.origin.toLowerCase();
  if (!ctx.platform.production && /http:\/\/localhost:\d+/.test(origin)) {
    return headers.set("Access-Control-Allow-Origin", origin);
  }

  if (options.origin === "*") {
    return headers.set("Access-Control-Allow-Origin", "*");
  }

  if (options.origin.toLowerCase().split(/\,\s/g).includes(origin)) {
    return headers.set("Access-Control-Allow-Origin", origin);
  }

  throw new Error(`Invalid origin ${origin}`);
}
