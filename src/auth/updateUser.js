// At this point we can assume that "auth" has already been validated
export default async function updateUser(user, auth, store) {
  if (auth.provider === "email") {
    return await store.set(auth.email, user);
  }
}
