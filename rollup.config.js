import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
// import { terser } from "rollup-plugin-terser";

export default {
  input: "src/index.js",
  output: {
    file: "index.js",
    format: "esm",
    // sourcemap: true,
  },
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    commonjs({ namedExports: { lru_map: ["LRUMap"] } }),
    // terser(),
  ],
  external: [
    "http",
    "zlib",
    "fs",
    "crypto",
    "events",
    "os",
    "path",
    "string_decoder",
    "stream",
    "querystring",
    "domain",
    "formidable",
  ],
};
