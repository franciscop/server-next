import { Database } from "bun:sqlite";
import { kv } from "../../..";

// A real SQLite file at the demo root (gitignored); tests point DB_FILE at
// ":memory:" so they never touch it
export const db = new Database(
  process.env.DB_FILE || `${import.meta.dir}/../data.db`,
);
db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, data TEXT)");
db.run("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT)");

// The documented custom-store shape: `get` returns the value or null and
// `set` with null deletes; polystore builds has/del/prefix (and an
// `{ expires, value }` envelope in the rows) on top.
const table = (name: string) => ({
  get: (key: string) => {
    const row = db
      .query(`SELECT data FROM ${name} WHERE id = ?`)
      .get(key) as { data: string } | null;
    return row ? JSON.parse(row.data) : null;
  },
  set: (key: string, value: unknown) => {
    if (value === null) {
      db.run(`DELETE FROM ${name} WHERE id = ?`, [key]);
      return;
    }
    db.run(`INSERT OR REPLACE INTO ${name} (id, data) VALUES (?, ?)`, [
      key,
      JSON.stringify(value),
    ]);
  },
});

// One kv() store per table, shared by the server options and the app code
// (the server returns an already-built store untouched), so the stored
// envelopes always match. Sessions carry their expiry here, since a built
// store keeps its own policy instead of getting the server's default.
export const users = kv(table("users"));
export const sessions = kv(table("sessions")).expires("1w");

// Management queries go straight to SQL, unwrapping the stored envelope
export const countUsers = () =>
  (db.query("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;

export const listUsers = ({ page = 1, search = "" }) => {
  const rows = db
    .query(
      `SELECT id, data FROM users WHERE data LIKE ?
       ORDER BY rowid LIMIT 10 OFFSET ?`,
    )
    .all(`%${search}%`, (page - 1) * 10) as { id: string; data: string }[];
  return rows.map(({ id, data }) => {
    const { name, email, role, picture } = JSON.parse(data).value;
    return { id, name, email, role, picture };
  });
};
