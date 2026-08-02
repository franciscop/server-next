import ServerError from "../ServerError";

// Every user that auth produces carries an `id` (the store key) and an `email`,
// whichever callback or built-in default produced it. This also catches a
// non-object return, like an `onLogin` doing `return 401` instead of throwing.
export default function assertUser(user: any, callback: string): void {
  if (!user || typeof user !== "object" || user.id == null || !user.email) {
    throw ServerError.AUTH_INVALID_USER({ callback });
  }
}
