// Declare global env variable
declare global {
  var env: Record<string, any>;
}

// Polyfill the Response if needed
if (typeof Response === "undefined") {
  (global as any).Response = function Response(
    body?: any,
    other: any = {},
  ): any {
    return { body, ...other };
  };
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
