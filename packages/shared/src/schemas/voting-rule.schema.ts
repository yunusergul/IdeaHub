import { z } from 'zod';

export const VotingRuleSchema = z.object({
  id: z.string(),
  categoryId: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  multiplier: z.number().min(0.1).max(10),
  isActive: z.boolean().default(true),
});

export type VotingRule = z.infer<typeof VotingRuleSchema>;

export const CreateVotingRuleSchema = z.object({
  categoryId: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  multiplier: z.number().min(0.1).max(10),
  isActive: z.boolean().default(true),
});

export const UpdateVotingRuleSchema = CreateVotingRuleSchema.partial();
