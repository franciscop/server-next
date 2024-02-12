function getRuntime() {
  if ("Bun" in globalThis) return "bun";
  if ("Deno" in globalThis) return "deno";
  if (globalThis.process?.versions?.node) return "node";
  return "unknown";
}

export default function getMachine() {
  return {
    runtime: getRuntime(),
    production: process.env.NODE_ENV === "production",
  };
}
