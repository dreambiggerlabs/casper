import { z } from "zod";

export const UserDto = {
  create: z.object({
    name: z.string().min(1, "Name is required").max(255),
    email: z.string().email("Must be a valid email").max(255),
  }),

  update: z
    .object({
      name: z.string().min(1, "Name must not be empty").max(255).optional(),
      email: z.string().email("Must be a valid email").max(255).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
} as const;

export type CreateUser = z.infer<typeof UserDto.create>;
export type UpdateUser = z.infer<typeof UserDto.update>;
