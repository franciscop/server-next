# A malformed URL answers 500

`pathPattern` decodes every path segment with `decodeURIComponent`, which
throws a `URIError` on broken percent-encoding. That escapes to `onError` as an
unknown error, so the client gets a 500 and the log gets a server error for what
is the client's mistake:

```
GET /users/%E0%A4%A  -> 500 Server Error
```

## Worth deciding

- **Refuse it with a 400.** What Express does ("Failed to decode param"). Needs
  a registered code (say `INVALID_URL`) and its entry in the errors docs.
- **Keep the segment undecoded** and let routing carry on: `:id` would receive
  `%E0%A4%A` as-is. No error at all, but a handler then sees a still-encoded
  value that it cannot tell apart from a legitimately encoded one.

The 400 is the conventional answer; the decode also runs once per route per
request, so doing it once up front would fix this and the repeated work together.
