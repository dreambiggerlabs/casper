import { z } from "zod";

export const AgentDto = {
  create: z.object({
    name: z.string().min(1, "Name is required").max(255),
  }),
} as const;

export type CreateAgent = z.infer<typeof AgentDto.create>;
