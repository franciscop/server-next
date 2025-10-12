import axios from "axios";
import type app from "./server";

// Helper type to extract valid routes and methods
type ExtractRoutes<T> =
  T extends server<infer R>
    ? { [P in R[number] as P["path"]]: P["method"] }
    : never;

// Dynamically derive `Routes` from the default export
type Routes = ExtractRoutes<typeof app>;

// Axios wrapper type enforcing valid paths and methods
type ApiRoutes = <P extends keyof Routes, M extends Routes[P]>(
  path: P,
  config?: Omit<Parameters<typeof axios.request>[0], "url" | "method"> & {
    method: M;
  },
) => ReturnType<typeof axios.request>;

// Implement `typedAxios` using the inferred `ApiRoutes` string
const typedAxios: ApiRoutes = ((path: string, config?: any) => {
  return axios.request({ url: path, ...config });
}) as ApiRoutes;

// Usage examples

// Valid requests
typedAxios("/users", { method: "GET" });
typedAxios("/users", { method: "POST", data: { name: "John Doe" } });
typedAxios("/books", { method: "GET" });

// Invalid requests
// @ts-expect-error
typedAxios("/users", { method: "PUMP" }); // ❌ Invalid method
// @ts-expect-error
typedAxios("/unknown", { method: "GET" }); // ❌ Invalid path
