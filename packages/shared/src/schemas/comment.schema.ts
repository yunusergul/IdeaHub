import { z } from 'zod';

export const CommentSchema = z.object({
  id: z.string(),
  ideaId: z.string(),
  userId: z.string(),
  content: z.string().min(1),
  parentId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});

export type Comment = z.infer<typeof CommentSchema>;

export const CreateCommentSchema = z.object({
  ideaId: z.string(),
  content: z.string().min(1),
  parentId: z.string().nullable().optional(),
});
