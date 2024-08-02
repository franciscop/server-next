# Error management

> This is part of the "Ideas", early thoughts not yet, or only partially, implemented to explore different ideas to see what works best.

Middleware is a very powerful pattern and we believe the way to go, but it introduces two different issues: cascading and error handling (which can also cascade). First the easy one, why is error handling hard? Because each middleware might manage it as they see fit, which is not suitable for a unified API as you might want to build with Server:

```js
// From the front-end, an example
const body = await myApi.get("/users/25");
if (body.error) {
  // This assumes the body structure is { error: { code, message }}
  console.log(body.error.code, body.error.message);
}
```

This is all fine, but now your `auth` middleware (or any other) throws a `401` with a single body _string_, `"Unauthorized"`. BAM, your front-end has a fatal error message, and you cry.

Worse yet, it's not easy to customize at the middleware level, because all of it needs to either support customizing errors (which is usually an after-thought, AND a big burden if you have a lot):

```js
const handler = (error) => {
  MyLogger.log(error); // Use whatever lib you are using
  return status(500).json({
    error: {
      code: "AUTH_UNAUTHORIZED",
      message: "Please log in first",
    },
  });
};

export default server()
  .use(middle1({ onError: handler }))
  .use(middle2({ handleError: handler }))
  .get('...', ...);
```

Then, developers using the library also write bugs, and it's the library's goal to be as resilient to those as possible. For this, we should try to avoid halting the app if possible, and thus if the dev writes this:

```js
export default server().get("/users/:id", async (ctx) => {
  // ...
  // ...

  throw new Error("Ha?");
});
```

It makes more sense that we return a `500` + `"Server error"` instead of halting the server altogether. There's very rare ocassions in modern dev that we want to stop the server altogether.

For a _very_ full example that handles a lot of cases (note: usually this'd be overkill), we want:

No error > inline error handler > method error handler > global error handler > internal error handler:

```js
// Global error handler
const onError = error => status(500).json({ ... })

export default server({ onError })
  .use(someAuthMiddleware)
  .get("/users/:id", async (ctx) => {
    try {
      const user = await getUser(ctx.url.params.id);

      // Inline error handler (example, could throw instead with a try/catch)
      if (!(await canReadUser(ctx.auth, user))) {
        return status(401).json({ ... });
      }

      // Success
      return status(200).json(user);
    } catch (error) {
      // Method error handler
      return status(500).json({ ... });
    }
  });
```

The global error handler `onError` here overwrites the "internal error handler" (as long as there's no bugs in there!) and will be called when any middleware fails, which includes the API methods. As such, if you write a good generic `onError` you would not need the try/catch in every route:

```js
// We export `ClientError`, `ServerError` and `StatusError`
// all extending the native `Error`
import { ClientError, status } from '@server/next';

// Global error handler
const onError = error => {
  MyLogger.log(error);
  // ClientError's message is public
  if (error instanceof ClientError) {
    return status(error.status || 400).json({ message: error.message });
  }
  // Any others should be assumed private
  return status(error.status || 500).json({ message: 'Server error' });
};

export default server({ onError })
  .use(someAuthMiddleware)
  .get("/users/:id", async (ctx) => {
    const user = await getUser(ctx.url.params.id);

    if (!(await canReadUser(ctx.auth, user))) {
      throw ClientError(..., { status: 401 });
    }

    // Success
    return status(200).json(user);
  });
```
