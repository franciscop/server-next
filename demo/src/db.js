import kv from "polystore";

const fileToDb = (name) => {
  const store = kv(new URL(`file://${import.meta.dir}/../data/${name}`));
  return {
    list: async () => {
      const keys = await store.keys();
      return Promise.all(keys.map((k) => store.get(k)));
    },
    get: (id) => store.get(id),
    update: async (id, data) => {
      const value = await store.get(id);
      await store.set(id, { ...value, ...data });
    },
    replace: async (id, data) => {
      await store.set(id, data);
    },
    delete: async (id) => {
      await store.del(id);
    },
  };
};

export default {
  pets: fileToDb("pets.json"),
};
