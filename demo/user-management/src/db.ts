import { Database } from "bun:sqlite";
import type { User } from "./schemas.ts";

// Tests point DB_FILE at ":memory:" so they never touch the dev file
export const db = new Database(
  process.env.DB_FILE || `${import.meta.dir}/../data.db`,
);

// One table. Auth takes no store and defines no schema, so this is entirely
// the app's shape: `onLogin` writes it and `getUser` reads it.
db.run(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member',
  picture TEXT,
  provider TEXT
)`);

export const users = {
  find: (id: string) =>
    db.query("SELECT * FROM users WHERE id = ?").get(id) as User | undefined,

  upsert(profile: { id: string; email: string; name?: string; avatar?: string; provider: string }) {
    // The role is defaulted on the first login only, so a promotion in the UI
    // is never overwritten by the next sign-in
    const role = profile.email === process.env.ADMIN_EMAIL ? "admin" : "member";
    db.run(
      `INSERT INTO users (id, name, email, role, picture, provider)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(email) DO UPDATE SET name = ?2, picture = ?5`,
      [profile.id, profile.name ?? null, profile.email, role, profile.avatar ?? null, profile.provider],
    );
    return db
      .query("SELECT id FROM users WHERE email = ?")
      .get(profile.email) as { id: string };
  },

  update(id: string, fields: Partial<User>) {
    const keys = Object.keys(fields);
    if (!keys.length) return;
    const set = keys.map((k, i) => `${k} = ?${i + 2}`).join(", ");
    db.run(`UPDATE users SET ${set} WHERE id = ?1`, [id, ...Object.values(fields)]);
  },

  del: (id: string) => db.run("DELETE FROM users WHERE id = ?", [id]),

  list: ({ page = 1, search = "" }) =>
    db
      .query(
        `SELECT id, name, email, role, picture FROM users
         WHERE name LIKE ?1 OR email LIKE ?1
         ORDER BY rowid LIMIT 10 OFFSET ?2`,
      )
      .all(`%${search}%`, (page - 1) * 10) as User[],
};
