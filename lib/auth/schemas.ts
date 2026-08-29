import { z } from 'zod';

export const emailSchema = z.email('Введите корректную почту').trim().toLowerCase().max(254);
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Минимум 3 символа')
  .max(24, 'Максимум 24 символа')
  .regex(/^[a-z0-9_]+$/u, 'Только латиница, цифры и подчёркивание');
export const passwordSchema = z
  .string()
  .min(10, 'Минимум 10 символов')
  .max(128, 'Максимум 128 символов')
  .regex(/[A-Za-zА-Яа-яЁё]/u, 'Добавьте букву')
  .regex(/[0-9]/u, 'Добавьте цифру');

export const registrationSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Пароли не совпадают',
    path: ['passwordConfirmation'],
  });

export const loginSchema = z.object({
  login: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
});

export const verificationSchema = z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/u) });
export const resetRequestSchema = z.object({ email: emailSchema });
export const resetSchema = z
  .object({ token: z.string().min(20), password: passwordSchema, passwordConfirmation: z.string() })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Пароли не совпадают',
    path: ['passwordConfirmation'],
  });

export const codeSchema = z.string().trim().regex(/^\d{6}$/u, 'Введите 6 цифр');
