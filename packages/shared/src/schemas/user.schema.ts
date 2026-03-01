import { z } from 'zod';

export const UserRole = z.enum(['admin', 'product_manager', 'user']);
export type UserRole = z.infer<typeof UserRole>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  department: z.string(),
  role: UserRole,
  initials: z.string().max(3),
  azureId: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  locale: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({ id: true });
export const UpdateUserSchema = UserSchema.partial().omit({ id: true });
