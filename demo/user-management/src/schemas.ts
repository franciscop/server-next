import { z } from "zod";

// Validation for the management API; the same schemas drive the OpenAPI spec

export const Pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(),
});

export const NewUser = z.object({
  name: z.string().min(1).optional(),
  email: z.email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export const UserPatch = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "member"]).optional(),
});

export const PublicUser = z.object({
  id: z.string(),
  name: z.string().nullish(),
  email: z.string(),
  role: z.enum(["admin", "member"]),
});

export const UserList = z.array(PublicUser);

// The stored record: what NewUser validates, plus what a GitHub login adds
const StoredUser = NewUser.extend({
  id: z.string().optional(),
  picture: z.string().optional(),
});
export type User = z.infer<typeof StoredUser>;
