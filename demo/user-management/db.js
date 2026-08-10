import { Database } from "bun:sqlite";
import { kv } from "../..";

// A real SQLite file next to this demo (gitignored)
export const db = new Database(`${import.meta.dir}/data.db`);
db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, data TEXT)");
db.run("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT)");

// The documented custom-store shape: `get` returns the value or null and
// `set` with null deletes; polystore builds has/del/prefix (and an
// `{ expires, value }` envelope in the rows) on top.
const table = (name) => ({
  get: (key) => {
    const row = db.query(`SELECT data FROM ${name} WHERE id = ?`).get(key);
    return row ? JSON.parse(row.data) : null;
  },
  set: (key, value) => {
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

// The raw adapters go to the server options (it wraps them with kv() itself);
// app code reads and writes through the same wrapper so the envelopes match
export const users = table("users");
export const sessions = table("sessions");
export const userRecords = kv(users);

// Management queries go straight to SQL, unwrapping the stored envelope
export const countUsers = () =>
  db.query("SELECT COUNT(*) AS n FROM users").get().n;

export const listUsers = ({ page = 1, search = "" }) => {
  const rows = db
    .query(
      `SELECT id, data FROM users WHERE data LIKE ?
       ORDER BY rowid LIMIT 10 OFFSET ?`,
    )
    .all(`%${search}%`, (page - 1) * 10);
  return rows.map(({ id, data }) => {
    const { name, email, role, picture } = JSON.parse(data).value;
    return { id, name, email, role, picture };
  });
};
