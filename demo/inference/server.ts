// server.ts
type Method = "GET" | "POST" | "PUT" | "DELETE";

interface Route {
  method: Method;
  path: string;
}

class server<Routes extends Route[] = []> {
  handlers!: Routes;

  constructor() {
    this.handlers = [] as unknown as Routes; // Initialize the handlers
  }

  get<Path extends string>(
    path: Path,
    handler: () => void,
  ): server<[...Routes, { method: "GET"; path: Path }]> {
    (this.handlers as unknown as Array<Route>).push({ method: "GET", path });
    return this as unknown as server<
      [...Routes, { method: "GET"; path: Path }]
    >;
  }

  post<Path extends string>(
    path: Path,
    handler: () => void,
  ): server<[...Routes, { method: "POST"; path: Path }]> {
    (this.handlers as unknown as Array<Route>).push({ method: "POST", path });
    return this as unknown as server<
      [...Routes, { method: "POST"; path: Path }]
    >;
  }

  // Add a utility to extract the type of routes as a mapping of paths to methods
  get types(): {
    [R in Routes[number] as R["path"]]: R["method"];
  } {
    return {} as any; // This is only for type inference; no runtime logic needed.
  }
}

// Create a server instance and define routes
export default new server()
  .get("/users", () => {})
  .get("/users/:id", () => {})
  .post("/users", () => {})
  .get("/books", () => {});
