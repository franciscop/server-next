// At this point we can assume that "auth" has already been validated
export default async function updateUser(user: any, auth: any, store: any): Promise<void> {
  if (auth.provider === "email") {
    return await store.set(auth.email, user);
  }
}
