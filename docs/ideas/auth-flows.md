# The auth flavours: key, tokens, jwts and cookies

The 4 most common ways of protecting an API are those 4:

- Key: a key issued to protect resource(s) and that should be included to access those.
- Token: an opaque token issued to a specific user and that should be included to access the API.
- JWT: a variant of the Token, where the token has some extra information that can be used in the front-end.
- Cookies: a variant of the Token, where the token is stored in secure cookies.

While there are other ways to protect APIs (basic auth, PASETO, Webauth) those are not so widespread and still not supported by Server.js.

The list above is also a bit of a mix of protocols, methodologies, etc. since it's about groups of practices; while you could e.g. use a JWT token with a cookie, that is not really done in practice since it doesn't make sense (given that one of the goals of JWT is that the client can read some user information, which is not possible on a secure cookie).

So let's see the different methods in detail.

# Key authentication

This is when a Key is issued to protect a given resource or group of resources, and only with that key they can be accessed. It can be very simple (a globally-unique key) or more complex (each user can have multiple keys), but the basis of it and main difference is that this is based on access and not attached to a user session.

This is very typical for M2M access, API calls, etc. It is also common to limit the number of requests per key or charge money per number of requests per key.

# Token authentication
