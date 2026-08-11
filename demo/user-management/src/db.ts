import { Database } from "bun:sqlite";
import { kv } from "../../..";
import type { User } from "./schemas.ts";

// Tests point DB_FILE at ":memory:" so they never touch the dev file
export const db = new Database(
  process.env.DB_FILE || `${import.meta.dir}/../data.db`,
);
db.run(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  picture TEXT,
  provider TEXT,
  strategy TEXT
)`);
db.run(`CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user TEXT REFERENCES users(id),
  provider TEXT,
  created TEXT,
  expires_at INTEGER
)`);

type UserRow = User & { provider?: string | null; strategy?: string | null };

// HAS_EXPIRATION adapters receive bare values plus a TTL, no envelope
const usersTable = {
  HAS_EXPIRATION: true,
  get: (id: string) =>
    db.query("SELECT * FROM users WHERE id = ?").get(id) as UserRow | null,
  set: (id: string, user: UserRow | null) => {
    if (user === null) return usersTable.del(id);
    db.run(
      `INSERT OR REPLACE INTO users (id, name, email, role, picture, provider, strategy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.name ?? null,
        user.email,
        user.role ?? "member",
        user.picture ?? null,
        user.provider ?? null,
        user.strategy ?? null,
      ],
    );
  },
  del: (id: string) => {
    db.run("DELETE FROM users WHERE id = ?", [id]);
  },
  add: (prefix: string, user: UserRow) => {
    const id = crypto.randomUUID();
    usersTable.set(prefix + id, user);
    return id;
  },
};

type SessionRow = { user: string; provider: string; created: string };

const sessionsTable = {
  HAS_EXPIRATION: true,
  get: (id: string) => {
    const row = db
      .query("SELECT * FROM sessions WHERE id = ?")
      .get(id) as (SessionRow & { expires_at: number | null }) | null;
    if (!row) return null;
    if (row.expires_at && row.expires_at <= Date.now()) {
      sessionsTable.del(id);
      return null;
    }
    return { user: row.user, provider: row.provider, created: row.created };
  },
  set: (id: string, session: SessionRow | null, expires?: number | null) => {
    if (session === null) return sessionsTable.del(id);
    db.run(
      `INSERT OR REPLACE INTO sessions (id, user, provider, created, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        session.user ?? null,
        session.provider ?? null,
        session.created ?? null,
        expires == null ? null : Date.now() + expires * 1000,
      ],
    );
  },
  del: (id: string) => {
    db.run("DELETE FROM sessions WHERE id = ?", [id]);
  },
};

const list = async ({ page = 1, search = "" }) =>
  db
    .query(
      `SELECT id, name, email, role, picture FROM users
       WHERE name LIKE ?1 OR email LIKE ?1
       ORDER BY rowid LIMIT 10 OFFSET ?2`,
    )
    .all(`%${search}%`, (page - 1) * 10) as User[];

// Shared with the server options; a derived store loses the extensions
export const users = Object.assign(kv(usersTable), { list });

// A built store keeps its own expiry, the server's 1w default only covers raw sources
export const sessions = kv(sessionsTable).expires("1w");
