// Declare global env variable
declare global {
  var env: Record<string, string | undefined>;
}

// Polyfill Netlify's environment variables
(globalThis as any).env = {};

if (typeof (globalThis as any).Netlify !== "undefined") {
  Object.assign(
    (globalThis as any).env,
    (globalThis as any).Netlify.env.toObject(),
  );
}

if (typeof process !== "undefined") {
  Object.assign((globalThis as any).env, process.env);
}

// Export to make this an ES module
export {};
