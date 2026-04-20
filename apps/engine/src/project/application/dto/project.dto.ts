import { z } from "zod";

const credentialSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("https_token"),
    username: z.string().max(255).optional(),
    token: z.string().min(1).max(4096),
  }),
  z.object({
    type: z.literal("ssh_key"),
    privateKey: z.string().min(1).max(16384),
    passphrase: z.string().max(1024).optional(),
  }),
]);

export const ProjectDto = {
  credential: credentialSchema,

  create: z.object({
    title: z.string().min(1, "Title is required").max(255),
    description: z.string().nullish(),
    repositoryUrl: z.string().url().max(2048).nullish(),
    credential: credentialSchema.nullish(),
  }),

  update: z
    .object({
      title: z.string().min(1, "Title must not be empty").max(255).optional(),
      description: z.string().nullish(),
      repositoryUrl: z.string().url().max(2048).nullish(),
      credential: credentialSchema.nullish(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
} as const;

export type CreateProject = z.infer<typeof ProjectDto.create>;
export type UpdateProject = z.infer<typeof ProjectDto.update>;
