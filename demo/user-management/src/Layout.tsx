import type { User } from "./schemas.ts";

// The shell for every page: top bar with session actions, then the content
export default function Layout({
  user,
  children,
}: {
  user?: User;
  children?: unknown;
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>User management</title>
        <link rel="stylesheet" href="/styles.css" />
        <script src="/client.js" defer></script>
      </head>
      <body>
        <header>
          <a href="/" class="brand">
            ◍ User management
          </a>
          {user && (
            <nav>
              <a href="/docs">API docs</a>
              <form method="POST" action="/auth/logout">
                <button class="ghost">Log out</button>
              </form>
            </nav>
          )}
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
