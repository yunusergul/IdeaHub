import { z } from 'zod';

export const VoteType = z.enum(['up']);
export type VoteType = z.infer<typeof VoteType>;

export const VoteSchema = z.object({
  id: z.string(),
  ideaId: z.string(),
  userId: z.string(),
  type: VoteType,
});

export type Vote = z.infer<typeof VoteSchema>;

export const CastVoteSchema = z.object({
  ideaId: z.string(),
  type: VoteType,
});
