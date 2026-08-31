# Errors

Every error the framework raises carries a **code**, a **status**, a **message** and a **hint**. This demo produces one of each so you can see both sides of that: what a browser shows you while building, and what a client actually receives.

```bash
bun --hot .      # then open http://localhost:3000
```

Open a link in the browser and you get the development error page: the message, the hint that says how to fix it, and a link to the docs for that code. Ask for the same URL with curl and you get what a real client gets:

```bash
curl -i localhost:3000/upload    # 413, and the message, because a 4xx is the client's mistake
curl -i localhost:3000/boom      # 500 Server Error, and nothing else
```

`/boom` is the one to look at twice. The handler throws with a connection string in the message; the response says only `Server Error`, and the real message, its hint and its stack go to the terminal. A plain `throw` has no status, so it is a 500, so it is never published.

The limits here are deliberately tiny (`maxBodySize: '1kb'`, `maxFileSize: '1kb'`, `maxFiles: 3`) so a link can trip them. Most routes are GETs that ask the app for a POST of their own, since a link cannot carry a body.

There is no catch-all route, so `/nope` reaches `NOT_FOUND` and its hint tells you how to add one.

See [the Errors documentation](https://server-js.com/documentation/errors) for every code.
