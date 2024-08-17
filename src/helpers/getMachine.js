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
  const provider = getProvider();
  return {
    provider,
    service: getService(),
    runtime: getRuntime(),
    // Can I cry now?
    production:
      provider === "netlify"
        ? Netlify.env.get("NETLIFY_DEV") === "true"
        : process.env.NODE_ENV === "production",
  };
}
