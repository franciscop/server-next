import ServerError from "../errors";

// A dashboard prints an issuer with or without its trailing slash, and `iss`
// itself carries one for some issuers (Auth0), so comparisons use the bare form.
export const bare = (url: string) => url.replace(/\/+$/, "");

// One discovery document per issuer, shared by the login flow (oidc) and token
// verification: the spec fixes the URL, so there is one fetch and one cache.
const discovered = new Map<string, Promise<any>>();

export function discover(issuer: string): Promise<any> {
  const base = bare(issuer);
  let doc = discovered.get(base);
  if (!doc) {
    const url = `${base}/.well-known/openid-configuration`;
    // A network failure and a non-OK response are the same outage: coded, so
    // the operator gets the hint and callers can tell it from a bad credential
    doc = fetch(url)
      .catch(() => null)
      .then((r) => {
        if (!r?.ok) throw ServerError.AUTH_ISSUER_UNREACHABLE({ url });
        return r.json();
      });
    // A failed fetch must not poison the cache
    doc.catch(() => discovered.delete(base));
    discovered.set(base, doc);
  }
  return doc;
}
