export default async function findUser(auth, store) {
  if (auth.provider === "email") {
    return await store.get(auth.email);
  }
}
