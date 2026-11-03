// Declare global env variable
declare global {
  var env: Record<string, string | undefined>;
}

// The globals this file reads and writes, declared once rather than cast at
// every use: `env` is ours, `Netlify` is theirs and is in no lib we have.
const runtime = globalThis as typeof globalThis & {
  env: Record<string, string | undefined>;
  Netlify?: { env: { toObject(): Record<string, string> } };
};

// Every runtime's environment variables, merged into one `env` at import
runtime.env = {};

if (typeof runtime.Netlify !== "undefined") {
  Object.assign(runtime.env, runtime.Netlify.env.toObject());
}

if (typeof process !== "undefined") {
  Object.assign(runtime.env, process.env);
}

// Workers only expose their env at import time through this module. A variable
// specifier, so bundlers for other runtimes do not try to resolve it.
if (runtime.navigator?.userAgent === "Cloudflare-Workers") {
  const name = "cloudflare:workers";
  const { env: workers } = await import(name);
  Object.assign(runtime.env, workers);
}

// Export to make this an ES module
export {};
