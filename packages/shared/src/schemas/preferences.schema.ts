import { z } from 'zod';

export const UserPreferencesSchema = z.object({
  id: z.string(),
  userId: z.string(),
  notifyAppComment: z.boolean(),
  notifyAppVote: z.boolean(),
  notifyAppStatus: z.boolean(),
  notifyAppSurvey: z.boolean(),
  notifyEmailComment: z.boolean(),
  notifyEmailVote: z.boolean(),
  notifyEmailStatus: z.boolean(),
  notifyEmailSurvey: z.boolean(),
});

export const UpdatePreferencesSchema = z.object({
  notifyAppComment: z.boolean().optional(),
  notifyAppVote: z.boolean().optional(),
  notifyAppStatus: z.boolean().optional(),
  notifyAppSurvey: z.boolean().optional(),
  notifyEmailComment: z.boolean().optional(),
  notifyEmailVote: z.boolean().optional(),
  notifyEmailStatus: z.boolean().optional(),
  notifyEmailSurvey: z.boolean().optional(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type UpdatePreferences = z.infer<typeof UpdatePreferencesSchema>;
