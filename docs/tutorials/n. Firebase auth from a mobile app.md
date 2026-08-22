# Firebase auth from a mobile app

Firebase Authentication owns your user base. People sign in through its SDK, on the phone or in the browser, with Google, Apple, a phone number or a password, and Firebase hands the app an **ID token**. Your server verifies that token and nothing else: no login routes, no client secret, no password ever reaching you.

Worth being clear about what Firebase is, because the naming misleads. It is not "sign in with Google". Google is an identity *provider*: it owns those accounts. Firebase is an identity *platform*: it owns **your** accounts, and Google is one of the ways people can get into them.

## 1. Verify the token

```js
import server from '@server/next';

export default server({ auth: 'jwt:firebase' })
  .get('/api/me', (ctx) => ctx.user ?? 401);
```

```sh
FIREBASE_ISSUER=https://securetoken.google.com/my-project-id
FIREBASE_AUDIENCE=my-project-id
```

Your project id appears in both, and that is not a mistake: Firebase gives every project its own issuer URL, and then puts the same id in the token's audience claim. So `my-project-id` is the only thing that changes between deployments.

The signing keys are Google's, rotated every few hours, and published at a URL the framework discovers from the issuer. They are fetched on the first request that carries a token and cached, so the rotation costs nothing: an unfamiliar key id triggers a single refetch.

Google Cloud Identity Platform is the same service under its enterprise name, with the same tokens and the same issuer format. `jwt:gcip` reads `GCIP_ISSUER` and `GCIP_AUDIENCE` if you prefer that spelling in your config.

## 2. Send it from the app

The SDK holds the session and mints an ID token from it. Ask for the token before each call rather than storing it:

```swift
// iOS, with FirebaseAuth
guard let token = try await Auth.auth().currentUser?.getIDToken() else {
  return   // nobody is signed in
}
request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
```

```js
// Web or React Native
const user = auth.currentUser;
if (!user) return;                       // nobody is signed in

const token = await user.getIdToken();   // cached, or refreshed if expired
await fetch('/api/me', {
  headers: { authorization: `Bearer ${token}` },
});
```

**Firebase ID tokens last one hour.** `getIdToken()` returns the cached one while it is valid and transparently fetches a new one when it is not, so calling it per request is the correct pattern and costs almost nothing. Grabbing a token once at launch and reusing it is the mistake to avoid: the app will work for an hour and then start getting `401`s, which is a miserable bug to chase.

`currentUser` is `null` before the SDK has restored the session from disk. On a cold start that takes a moment, so an app that fires a request immediately can find itself signed out for a heartbeat. Wait for the auth state listener before making calls, or handle the `null` as "not ready yet" rather than "signed out".

## 3. What is in the claims

Without a `getUser`, `ctx.user` is the token payload:

```js
{
  sub: 'kV9xQ2...',           // the Firebase uid
  email: 'ada@x.com',
  email_verified: true,
  name: 'Ada',
  picture: 'https://...',
  firebase: { sign_in_provider: 'google.com' },
}
```

`sub` is a **Firebase uid**, not a Google account id, even for someone who signed in with Google. Firebase issued this token about its own account, and `firebase.sign_in_provider` records which method got them there. That field is worth reading if your product treats a passwordless phone signup differently from a Google account, and it is the only way to tell them apart.

## 4. Map to your own table

Claims are enough while you only need to know who someone is. The moment you own rows they can edit, you need your id next to theirs:

```js
const PROJECT = 'my-project-id';

const auth = {
  issuer: `https://securetoken.google.com/${PROJECT}`,
  audience: PROJECT,
  // `id` is the `sub` claim: the Firebase uid
  getUser: (id) => db.query('SELECT * FROM users WHERE firebase_uid = ?').get(id),
};
```

The written-out form is here because `getUser` has no place in the `'jwt:firebase'` string. Everything else it sets is the same.

Key your table on the **uid**, not the email. The uid is stable for the life of the account, while the email can change, be absent entirely (phone sign-in) or be reused by a different person after a deletion. That query returning `undefined` is how you find out someone signed in for the first time, which is a reasonable place to create the row.

## 5. Anonymous users

Firebase can create real accounts for people who have not identified themselves at all, which is handy for a "try it before signing up" flow. Those tokens verify exactly like any other, so without a check they count as signed in:

```js
  .post('/orders', (ctx) => {
    if (!ctx.user) return 401;
    if (ctx.user.firebase?.sign_in_provider === 'anonymous') return 403;
    return db.orders.create(ctx.body);
  })
```

Read the whole flow before deciding this is a problem. Anonymous accounts are usually deliberate, and Firebase can later upgrade one in place, keeping the same uid, so a cart built anonymously survives the person signing up. If you have that flow, blanket-blocking anonymous users throws away the feature.

## Next steps

- [Clerk auth in a same-origin cookie](/tutorials/m-clerk-auth-in-a-same-origin-cookie): another hosted service, with its claims in different places.
- [Discord login with JWT bearer tokens](/tutorials/k-discord-login-with-jwt-bearer-tokens): issuing your own tokens instead of verifying someone else's.
