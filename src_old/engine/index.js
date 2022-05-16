import node from "./node.js";
import cloudflare from "./cloudflare.js";

// Loosely find which one is the correct runtime through ducktyping
export default () => {
  if (typeof addEventListener !== "undefined" && typeof fetch !== "undefined") {
    return cloudflare;
  }

  // It is Node.js by default
  return node;
};

export { node, cloudflare };
