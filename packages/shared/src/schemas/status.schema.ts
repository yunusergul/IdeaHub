import { z } from 'zod';

export const StatusSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  color: z.string(),
  bg: z.string(),
  order: z.number().int(),
  description: z.string(),
  isSystem: z.boolean().default(false),
});

export type Status = z.infer<typeof StatusSchema>;

export const CreateStatusSchema = StatusSchema.omit({ id: true });
export const UpdateStatusSchema = StatusSchema.partial().omit({ id: true });
