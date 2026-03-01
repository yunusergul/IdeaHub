import { z } from 'zod';

export const AttachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  url: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

export const IdeaSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  content: z.string(),
  categoryId: z.string(),
  statusId: z.string(),
  authorId: z.string(),
  sprintId: z.string().nullable().optional(),
  upvotes: z.number().int().default(0),
  downvotes: z.number().int().default(0),
  commentCount: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type Idea = z.infer<typeof IdeaSchema>;

export const CreateIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  content: z.string(),
  categoryId: z.string(),
  attachmentIds: z.array(z.string()).optional(),
});

export const UpdateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  categoryId: z.string().optional(),
  statusId: z.string().optional(),
  sprintId: z.string().nullable().optional(),
});
