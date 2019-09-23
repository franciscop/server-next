import node from "./node.js";
import cloudflare from "./cloudflare.js";

// Cloudflare has to be detected and launched immediately, so no async/await
const detectEngineSync = () => {
  if (typeof addEventListener !== "undefined" && typeof fetch !== "undefined") {
    return cloudflare;
  }
};

// Node.js can be detected async by the presence of `http`
const detectEngineAsync = async () => {
  try {
    await import("http");
    return node;
  } catch (error) {
    throw new Error("Could not find engine automatically");
  }
};

// Loosely find which one is the correct runtime through ducktyping
export default () => detectEngineSync() || detectEngineAsync();
