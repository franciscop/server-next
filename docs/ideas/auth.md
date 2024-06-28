# Auth Documentation

> This is a very early draft

The `auth` module will take over the `/auth` and adds a series of endpoints and validation options for your routes. In its simplest form, you can activate it with e.g. Github like this:

Global options:

- `type` (`jwt|token|key|cookie`): the primary mechanism for authentication. This is a very important option, since it will determine other things like available endpoints, configuration, etc. It's all detailed in the [type documentation](#type).
- `providers` (`['email','username','github']`): a list of the providers that can allow for authentication. Again, this is an important option that might change some of the other options, like callbacks, etc.

Local options:

- `type`: override the global type
- `role`: limit to the roles that are accepted for that endpoint

```js
// types: 'jwt', 'cookie', '',
const auth = { type: "jwt", providers: ["github"] };

export default server({ auth })
  .get("/", { auth: false }, (ctx) => {
    // Disable any and all auth for this endpoint
  })
  .get("/users/me", (ctx) => {
    // All routes are protected by default when we use
    // the auth option, and now we have ctx.user
    console.log(ctx.user); // Defined, it *should* always have an `id` and a `role`
    console.log(ctx.auth); // ALSO defined, but recommended only for advanced usage
    // ctx.auth.token; ctx.auth.logout();
  })
  .get("/dashboard", { auth: "admin" }, (ctx) => {
    // All routes are protected by default when we use the auth option
  });
```

This automatically creates some endpoints:

```js
// 'cookie' defines these endpoints:
/auth/register
/auth/login
/auth/logout
/auth/reset
/auth/logout

// 'jwt', 'token', 'key' define these endpoints:
/api/auth/register
/api/auth/login
/api/auth/logout
/api/auth/reset
/api/auth/logout
```

On the front-end, it's all up to you. Here a small example with plain JS, see below for more in-depth examples:

```js
// Handle clicks on the "Login with Github" button
const onGithubButtonClick = async (e) => {
  const { data } = await api.get("/auth/login/github");
  if (data.url) window.location.href = data.url;
};

// When loading this page, execute the script
if (window.location.pathname.startsWith("/callback/github")) {
  const code = window.location.searchParams.get("code");
  const { data } = await api.post("/auth/verify/github", { code });
  const { token, user } = data;
  localStorage.token = token;
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// Finally, somewhere, some code for persisting
if (localStorage.token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${localStorage.token}`;
} else {
  delete api.defaults.headers.common["Authorization"];
}
```

After this, now you can call the routes and even the ones with security will be accessible once the user has logged in.

# Auth Ideas

Goals of the plugin:

- It has 90%+ of the needed glue for simple auth.
- It has hooks and extensions for more advanced auth.
- It encompases multiple sides of auth (e.g. Swagger+Authorization+Authentication+DB+providers+normalization)

Some ideas about how auth could work.

"Auth" is a broad term that has 3-4 responsibilities here:

UserManagement: register, login, logout. This has UI and DB, which is the tricky bits.

Authentication: Make sure the user is who they say it is. JWT, revalidation, etc. This should be pretty much out-of-the box, but allow some config for devs (JWT, Cookies, etc).

Authorization: this feels like it's always too custom and should be outside of the scope of the root library, BUT we should provide some easy helpers for the devs to check on it themselves.

How I'd like a library to integrate? Let's say I'm doing the React backend, and both Email, Github and Twitter auth methods. Then:

```js
const authConfig = {
  type: "jwt",
  fields: ["name", "nickname", "email"],
  addUser: (profile, ctx) => ctx.db.user.create({ ...profile }),
  providers: {
    email: {
      getUser: (ctx) => ctx.db.user.findOne(ctx.body.email),
    },
    github: {
      id: process.env.GITHUB_ID,
      secret: process.env.GITHUB_SECRET,
    },
    twitter: {
      id: process.env.TWITTER_ID,
      secret: process.env.TWITTER_SECRET,
    },
  },
};

export default server()
  .auth(authConfig)
  .post("/login")
  .post("/register")
  .get("/users")
  .get("/users/:id");
```

```js
const onGithubButtonClick = async (e) => {
  const { data } = await api.get("/auth/login/github");
  if (data.url) window.location.href = data.url;
};
```
