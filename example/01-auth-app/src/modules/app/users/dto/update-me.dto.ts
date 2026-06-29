import { z } from "zod";

export const UpdateMeSchema = z.object({
  name: z.string().min(1).optional(),
});

export type UpdateMeDto = z.infer<typeof UpdateMeSchema>;
