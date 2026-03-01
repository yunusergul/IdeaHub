import { z } from 'zod';

export const SurveyType = z.enum(['poll', 'rating', 'development']);
export type SurveyType = z.infer<typeof SurveyType>;

export const SurveyOptionSchema = z.object({
  id: z.string(),
  surveyId: z.string(),
  label: z.string().min(1),
});

export const SurveySchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  question: z.string().min(1),
  type: SurveyType,
  ideaId: z.string().nullable().optional(),
  createdById: z.string(),
  isActive: z.boolean().default(true),
  targetDepartments: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});

export type Survey = z.infer<typeof SurveySchema>;

const SurveyOptionInput = z.union([
  z.string().min(1),
  z.object({ ideaId: z.string(), label: z.string().min(1) }),
]);

export const CreateSurveySchema = z.object({
  title: z.string().min(1),
  question: z.string().min(1),
  type: SurveyType,
  ideaId: z.string().nullable().optional(),
  options: z.array(SurveyOptionInput).min(2).optional(),
  targetDepartments: z.array(z.string()).default([]),
  dueDate: z.string().datetime().optional(),
  autoTransition: z.boolean().optional(),
  targetStatusId: z.string().nullable().optional(),
  targetSprintId: z.string().nullable().optional(),
});

export const CastSurveyVoteSchema = z.object({
  surveyId: z.string(),
  optionId: z.string(),
});

export const CastSurveyRatingSchema = z.object({
  surveyId: z.string(),
  rating: z.number().int().min(1).max(5),
});
