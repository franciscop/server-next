import { Provider } from "@server/next";

const css = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font-family: system-ui, -apple-system, Segoe UI, sans-serif;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    color: #111827;
  }
  .card {
    background: #fff;
    width: 100%;
    max-width: 380px;
    padding: 32px;
    border-radius: 16px;
    box-shadow: 0 20px 50px rgba(17, 24, 39, 0.25);
  }
  h1 { margin: 0 0 20px; font-size: 22px; }
  .btn {
    display: block;
    padding: 12px 16px;
    margin-bottom: 10px;
    border: none;
    border-radius: 10px;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition: filter .15s, transform .05s;
  }
  .btn:hover { filter: brightness(1.08); }
  .btn:active { transform: translateY(1px); }
  .btn-github { background: #24292e; }
  .btn-google { background: #4285f4; }
  .btn-microsoft { background: #0078d4; }
  .btn-discord { background: #5865f2; }
  .btn-facebook { background: #1877f2; }
  .btn-apple { background: #000; }
  .avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: block;
    margin: 0 auto 16px;
  }
  pre {
    background: #f3f4f6;
    padding: 14px;
    border-radius: 10px;
    overflow: auto;
    font-size: 13px;
    line-height: 1.4;
  }
  .logout {
    display: block;
    width: 100%;
    margin-top: 8px;
    padding: 11px;
    border: none;
    border-radius: 10px;
    background: #ef4444;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }
  .logout:hover { filter: brightness(1.08); }
  .muted { color: #6b7280; font-size: 14px; }
`;

const Layout = ({ title, children }: { title: string; children: any }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <style>{css}</style>
    </head>
    <body>
      <div className="card">{children}</div>
    </body>
  </html>
);

const label = (p: string) => p[0].toUpperCase() + p.slice(1);

export const LoginPage = ({ providers }: { providers: Provider[] }) => (
  <Layout title="Login">
    <h1>Login Demo</h1>
    {providers.length === 0 && (
      <p className="muted">
        No providers configured. Add credentials to .env (see .env.template).
      </p>
    )}
    {providers.map((p) => (
      <a href={`/auth/login/${p}`} className={`btn btn-${p}`}>
        Login with {label(p)}
      </a>
    ))}
  </Layout>
);

export const AccountPage = ({ user }: { user: any }) => (
  <Layout title="Account">
    {user.picture && <img className="avatar" src={user.picture} alt="" />}
    <h1>Welcome {user.name}</h1>
    <pre>{JSON.stringify(user, null, 2)}</pre>
    <form method="POST" action="/auth/logout">
      <button className="logout">Logout</button>
    </form>
  </Layout>
);
