import { hashPassword, numericCode } from '@/lib/auth/crypto';
import { createAuthToken, createUser, deleteTokens, getUserByEmail, getUserByLogin, recordSecurityEvent } from '@/lib/auth/database';
import { sendAuthEmail } from '@/lib/auth/email';
import { isLocalDevelopment, json, validationError } from '@/lib/auth/http';
import { registrationSchema } from '@/lib/auth/schemas';

export async function POST(request: Request) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const { email, username, password } = parsed.data;
  if (await getUserByEmail(email)) return json({ ok: false, code: 'EMAIL_EXISTS', message: 'Эта почта уже используется' }, 409);
  if (await getUserByLogin(username)) return json({ ok: false, code: 'USERNAME_EXISTS', message: 'Этот юзернейм уже занят' }, 409);

  try {
    const user = await createUser({ email, username, passwordHash: await hashPassword(password) });
    if (!user) throw new Error('User creation failed');
    const code = numericCode();
    await deleteTokens(user.id, 'verify_email');
    await createAuthToken({ userId: user.id, purpose: 'verify_email', token: code, ttlSeconds: 15 * 60 });
    const delivery = await sendAuthEmail({ to: email, kind: 'verify_email', code });
    await recordSecurityEvent(user.id, 'registration_created');
    return json({
      ok: true,
      next: 'verify_email',
      email,
      delivery: delivery.delivered ? 'email' : 'local',
      ...(isLocalDevelopment() && !delivery.delivered ? { devCode: code } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNIQUE')) return json({ ok: false, message: 'Почта или юзернейм уже используются' }, 409);
    return json({ ok: false, message: 'Не удалось создать аккаунт' }, 500);
  }
}
