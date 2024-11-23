import kv from "polystore";

const demoDir = new URL(".", import.meta.url).pathname;

const fileToDb = (name) => {
  const store = kv(`file://${demoDir}/src/data/${name}`);
  return {
    list: () => store.values(),
    get: (id) => store.get(id),
    update: async (id, data) => {
      await store.set(id, { ...(await store.get(id)), ...data });
    },
    replace: (id, data) => store.set(id, data),
    delete: (id) => store.del(id),
  };
};

export default {
  pets: fileToDb("pets.json"),
};
