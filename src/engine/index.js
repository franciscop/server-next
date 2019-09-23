import node from "./node.js";
import cloudflare from "./cloudflare.js";

// Loosely find which one is the correct runtime through ducktyping
export default () => {
  if (typeof addEventListener !== "undefined" && typeof fetch !== "undefined") {
    return cloudflare;
  }
  return import("http")
    .then(() => node)
    .catch(() => {
      throw new Error("Could not find engine automatically");
    });
};
