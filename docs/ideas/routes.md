```js
const routes = {
  "/": { get: [], post: [], put: [], del: [] },
  "/books": {
    "/": { get: [], post: [], put: [], del: [] },
    "/search": { get: [], post: [], put: [], del: [] },
    "/info": { get: [], post: [], put: [], del: [] },
    "/*": { get: [], post: [], put: [], del: [] },
  },
  "/users": {
    "/": { get: [], post: [], put: [], del: [] },
    "/logout": { get: [], post: [], put: [], del: [] },
    "/:id": { get: [], post: [], put: [], del: [] },
  },
};

const routes = {
  "/": { get: [], post: [], put: [], del: [] },
  "/books": { get: [], post: [], put: [], del: [] },
  "/books/search": { get: [], post: [], put: [], del: [] },
  "/books/info": { get: [], post: [], put: [], del: [] },
  "/books/*": { get: [], post: [], put: [], del: [] },
  "/users": { get: [], post: [], put: [], del: [] },
  "/users/logout": { get: [], post: [], put: [], del: [] },
  "/users/:id": { get: [], post: [], put: [], del: [] },
};
```

```js
import server, { jwtAuth } from "server";
import BookRouter from "./BookRouter";
import UserRouter from "./UserRouter";

export default server({ port: 3000 })
  .use(jwtAuth)
  .route("/users", UserRouter)
  .route("/books", BookRouter);
```

```js
// UserRouter.js -> A custom router
import server, { router } from "server";

export default router()
  .get("/", getUsers)
  .get("/:id", getUser)
  .post("/", createUser);
```

MAYBE?

```js
// BookRouter.js -> a REST API router
import { RestRouter } from "server";

export default class BookRouter extends RestRouter {
  async create(ctx) {
    // POST /
  }
  async list(ctx) {
    // GET /
  }
  async get(ctx) {
    // GET /:id
  }
  async search(ctx) {
    // GET /?...
  }
  async update(ctx) {
    // PUT /:id
  }
  async set(ctx) {
    // PATCH /:id
  }
  async delete(ctx) {
    // DELETE /:id
  }
  async error(ctx) {
    // ctx.error
  }
}
```
