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

// Polyfill Netlify's environment variables
runtime.env = {};

if (typeof runtime.Netlify !== "undefined") {
  Object.assign(runtime.env, runtime.Netlify.env.toObject());
}

if (typeof process !== "undefined") {
  Object.assign(runtime.env, process.env);
}

// Export to make this an ES module
export {};
