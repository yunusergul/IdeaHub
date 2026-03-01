import { z } from 'zod';

export const SprintSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  isCurrent: z.boolean().default(false),
});

export type Sprint = z.infer<typeof SprintSchema>;

export const CreateSprintSchema = SprintSchema.omit({ id: true });
export const UpdateSprintSchema = SprintSchema.partial().omit({ id: true });
