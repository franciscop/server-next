import type app from "./server";

type Routes = (typeof app)["types"];

// Dynamically derive `ApiRoutes` from the default export's `types`
type ApiRoutes = <P extends keyof Routes, M extends Routes[P]>(
  path: P,
  options: RequestInit & { method: M },
) => Promise<Response>;

// Implement `typedFetch` using the inferred `ApiRoutes` type
const tFetch: ApiRoutes = (p: string, o: RequestInit) => fetch(p, o);

// Usage examples

// Valid request
tFetch("/users", { method: "GET" });
tFetch("/users", { method: "POST" });
tFetch("/books", { method: "GET" });

// Invalid method for path
// @ts-expect-error
tFetch("/users", { method: "PUMP" });

// Invalid path
// @ts-expect-error
tFetch("/unknown", { method: "GET" });
