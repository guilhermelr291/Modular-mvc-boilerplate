import z from 'zod';

export const SignUpSchema = z.object({
  name: z.string().min(2, 'Name must have, at least, 2 caracteres'),
  email: z.string().email('Email is required'),
  password: z.string().min(6, 'Password must have, at least, 6 caracteres'),
  confirmPassword: z
    .string()
    .min(6, 'ConfirmPassword must have, at least, 6 caracteres'),
});
