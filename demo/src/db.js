import { dirname } from "node:path";
import kv from "polystore";

const demoDir = dirname(import.meta.dirname);

const fileToDb = (name) => {
  const store = kv(new URL(`file://${demoDir}/data/${name}`));
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
