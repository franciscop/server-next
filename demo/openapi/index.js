import server from "../..";
import z from "zod";

const UserSchema = z.object({ name: z.string(), email: z.string() });
const UserList = z.array(UserSchema);

export default server({ openapi: true })
  .get("/", () => {
    // @description Get the homepage
    // @returns string
    return file("./views/index.html");
  })
  .get("/users", { response: UserList }, function getListOfUsers() {
    return [];
  })
  .post(
    "/users",
    { body: UserSchema, response: UserSchema },
    async function createNewUser(ctx) {
      console.log(ctx.body);
      return 201;
    },
  )
  .put(
    "/users/:id(number)",
    { body: UserSchema, response: UserSchema },
    async function updateExistingUser(ctx) {
      console.log(ctx.url.params.id, ctx.body);
      return 200;
    },
  )
  .del("/users/:id(number)", (ctx) => {
    console.log(ctx.url.params.id);
    return 200;
  });
