function getProvider() {
  if ("Netlify" in globalThis) return "netlify";
  return null;
}

function getService() {
  return null;
}

function getRuntime() {
  if ("Bun" in globalThis) return "bun";
  if ("Deno" in globalThis) return "deno";
  if (globalThis.process?.versions?.node) return "node";
  return null;
}

export default function getMachine() {
  return {
    provider: getProvider(),
    service: getService(),
    runtime: getRuntime(),
    production: process.env.NODE_ENV === "production",
  };
}
