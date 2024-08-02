# OpenAPI

We support openapi for different type validations: zod, joi, yup. Example:

```js
import server from "@server/next";
import z from "zod";

const UserSchema = z
  .object({
    id: z.string().openapi({ example: "123" }),
    name: z.string().openapi({ example: "John Doe" }),
    age: z.number().openapi({ example: 42 }),
  })
  .openapi("User");

const getUserSchema = {
  body: null,
  200: {
    description: "Retrieve the user",
    content: { "application/json": { schema: UserSchema } },
  },
  404: {
    description: "User not found",
    content: { "application/json": { schema: ErrorSchema } },
  },
  500: {
    description: "Server error",
    content: { "application/json": { schema: ErrorSchema } },
  },
};

const createUserSchema = {
  body: UserSchema,
  201: {
    description: "User created successfully",
    content: { "application/json": { schema: UserSchema } },
  },
  500: {
    description: "Server error",
    content: { "application/json": { schema: ErrorSchema } },
  },
};

export default server()
  .get("/users/:id", getUserSchema, async (ctx) => {
    const id = ctx.url.parms.id;
    const user = await store.get(id);
    if (!user) return status(404).json({ error: "User not found" });
    return json(user);
  })
  .post("/users", createUserSchema, async (ctx) => {
    ...
  })
  .error(ctx => status(500).json({ error: "Server error" }));
```
