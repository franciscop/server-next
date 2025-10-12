function getProvider() {
  if (typeof Netlify !== "undefined") return "netlify";
  return null;
}

function getRuntime() {
  if (typeof Bun !== "undefined") return "bun";
  if (typeof Deno !== "undefined") return "deno";
  if (globalThis.process?.versions?.node) return "node";
  return null;
}

function getProduction() {
  // Can I cry now?
  if (typeof Netlify !== "undefined")
    return Netlify.env.get("NETLIFY_DEV") !== "true";
  return process.env.NODE_ENV === "production";
}

export default function getMachine() {
  return {
    provider: getProvider(),
    runtime: getRuntime(),
    production: getProduction(),
  };
}
