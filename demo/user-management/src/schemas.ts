import { z } from "zod";

// Validation for the management API; the same schemas drive the OpenAPI spec

// The full stored record; everything else is a slice of it
export const User = z.object({
  id: z.string(),
  name: z.string().min(1).nullish(),
  email: z.email(),
  role: z.enum(["admin", "member"]),
  picture: z.string().nullish(),
});
export type User = z.infer<typeof User>;

// What the API accepts
export const NewUser = User.pick({ name: true, email: true }).extend({
  role: User.shape.role.default("member"),
});
export const UserPatch = User.pick({ name: true, role: true }).partial();

// What the API returns
export const PublicUser = User.omit({ picture: true });
export const UserList = z.array(PublicUser);

export const Pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});
