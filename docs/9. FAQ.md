# FAQ

### How is it different from Hono?

Server.js attempts to run your code unmodified in all runtimes. With Hono you need to change the code for different runtimes:

```js
// Server.js code for Node.js, Bun and Netlify
import server from "@server/next";
export default server().get("/", () => "Hello server!");
```

```js
// Hono code for Node.js
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.text('Hello Node.js!'))
serve(app)

// Hono code for Bun
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.text('Hello Bun!'))
export default app

// Hono code for Netlify
import { Hono } from 'jsr:@hono/hono'
import { handle } from 'jsr:@hono/hono/netlify'
const app = new Hono()
app.get('/', (c) => c.text('Hello Hono!'))
export default handle(app)
```
