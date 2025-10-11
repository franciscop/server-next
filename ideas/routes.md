## Routes are explicit

> This is a core divergence from Express and other frameworks, where they do default partial matches. This follows Elysia's design philosophy.

> Goal: when you write an application, it should be absolutely clear in what situation a route is going to be called or not. You should not have to follow a hard logic path to find that out. For _more_ details on why exactly, see [the comparison with Express](#vs-express-explicit-routes).

When you declare routes, either at the root level or in a router instance, it should be immediately clear given a path of which, if any, of the paths will be automatically matched. For that, we don't do partial matches by default. For example:

```ts
export default server().get('/users', () => {
  console.log('users', ctx.url.pathname);
});
````

The code above will match:

- `GET /users`

Anything else, like `GET /users/31`, `POST /users`, `GET /users/me` will _not match_ anything and thus return a 404.

If we want to add more matchers, we can do so explicitly with either a parameter `/users/:id`, `/users/:user_id` or with a wildcard `/users/*`:

```ts
export default server()
  .get('/users', userList)
  .get('/users/:id', userInfo)
  .get('/pets', petList)
  .get('/pets/nearme', nearbyPets)
  .get('/pets/*', petSubpaths);
````

This has two major advantages:

- First and most important, it's a lot more clear looking at this to know which URL is being matched given a path. The matching paths are straightforward, which reduces potential for bugs or confusion.
- Secondly, while the order _is still important_ in some cases, it's not as important as with other frameworks. You can swap the `/users` and `/users/:id` with no worries, since there's no url where they'll overlap. Watch out for that `/pets/nearme` and `/pets/*` though, there the order _is_ important. Given the explicit nature of the routes though it's a lot easier to spot these.


## Nested Routes

All good routing libraries allow you to split your routes into different files for whenever your project grows to organize things better.






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
  "/users/login": { get: [], post: [], put: [], del: [] },
  "/users/:id": { get: [], post: [], put: [], del: [] },
};
```

Resolving and comparing routes _fast_:

```js
// URL and what we try (and match)
'/users'             -> '/users'
'/users/login'       -> '/users/login'
'/users/43554'       -> '/users/43554' -> '/users/*'
'/users/43554/info'  -> '/users/43554/info' -> '/users/43554/*' -> '/users/*'
'/books/456/info'    -> '/books/456/info' -> '/books/456/*' -> '/books/*' -> '/*' -> 404
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
