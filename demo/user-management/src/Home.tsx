import Layout from "./Layout.tsx";
import type { User } from "./schemas.ts";

const Avatar = ({ user }: { user: User }) =>
  user.picture ? (
    <img class="avatar" src={user.picture} alt="" />
  ) : (
    <span class="avatar">{(user.name || user.email)[0].toUpperCase()}</span>
  );

const UserTable = ({ users, me }: { users: User[]; me?: string }) => (
  <table>
    <tr>
      <th>User</th>
      <th>Email</th>
      <th>Role</th>
      <th></th>
    </tr>
    {users.map((user) => (
      <tr>
        <td>
          <Avatar user={user} /> {user.name}
        </td>
        <td>{user.email}</td>
        <td>
          <span class={`badge ${user.role}`}>{user.role}</span>
        </td>
        <td>
          {user.id !== me && (
            <button class="ghost danger" data-delete={user.id}>
              Delete
            </button>
          )}
        </td>
      </tr>
    ))}
  </table>
);

// The single page: a login hero for guests, the dashboard once signed in
export default function Home({
  user,
  everyone,
}: {
  user?: User;
  everyone: User[];
}) {
  if (!user) {
    return (
      <Layout>
        <div class="hero">
          <h1>User management</h1>
          <p>
            GitHub login, SQLite sessions, a validated API and its live docs.
          </p>
          <a class="button" href="/auth/login/github">
            Sign in with GitHub
          </a>
        </div>
      </Layout>
    );
  }
  return (
    <Layout user={user}>
      <div class="greeting">
        <Avatar user={user} />
        <div>
          <h1>Hi {user.name || user.email}</h1>
          <p>
            Signed in as <span class={`badge ${user.role}`}>{user.role}</span>
          </p>
        </div>
      </div>
      {user.role === "admin" && (
        <>
          <UserTable users={everyone} me={user.id} />
          <h2>Add a user</h2>
          <form method="POST" action="/api/users">
            <input name="name" placeholder="Name" required />
            <input name="email" type="email" placeholder="Email" required />
            <select name="role">
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button>Add</button>
          </form>
        </>
      )}
    </Layout>
  );
}
