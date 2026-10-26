import { z } from 'zod';

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, { error: 'Email is required' })
  .max(255, { error: 'Email is too long' })
  .pipe(z.email({ error: 'Enter a valid email address' }));

// bcrypt only uses the first 72 bytes of a password, so longer ones are rejected outright.
const newPassword = z
  .string({ error: 'Password is required' })
  .min(8, { error: 'Password must be at least 8 characters' })
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    error: 'Password must be at most 72 bytes',
  })
  .refine((value) => /[A-Za-z]/.test(value), { error: 'Password must contain a letter' })
  .refine((value) => /\d/.test(value), { error: 'Password must contain a number' });

export const registerSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, { error: 'Name must be at least 2 characters' })
    .max(80, { error: 'Name must be at most 80 characters' }),
  email,
  password: newPassword,
});

// Login does not re-check password rules: it only has to match the stored hash.
export const loginSchema = z.object({
  email,
  password: z
    .string({ error: 'Password is required' })
    .min(1, { error: 'Password is required' })
    .max(200, { error: 'Password is too long' }),
});
