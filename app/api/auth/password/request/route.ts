import { hashToken, randomToken } from '@/lib/auth/crypto';
import { createAuthToken, deleteTokens, enforceRateLimit, getUserByEmail, recordSecurityEvent } from '@/lib/auth/database';
import { sendAuthEmail } from '@/lib/auth/email';
import { isLocalDevelopment, json, validationError } from '@/lib/auth/http';
import { resetRequestSchema } from '@/lib/auth/schemas';

export async function POST(request: Request) {
  const parsed = resetRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  if (!(await enforceRateLimit(`password-reset:${await hashToken(parsed.data.email)}`, 5, 60 * 60))) return json({ ok: true });
  const user = await getUserByEmail(parsed.data.email);
  if (!user) return json({ ok: true });

  const token = randomToken();
  await deleteTokens(user.id, 'password_reset');
  await createAuthToken({ userId: user.id, purpose: 'password_reset', token, ttlSeconds: 30 * 60 });
  const resetUrl = `${new URL(request.url).origin}/auth?reset=${encodeURIComponent(token)}`;
  const delivery = await sendAuthEmail({ to: user.email, kind: 'password_reset', resetUrl });
  await recordSecurityEvent(user.id, 'password_reset_requested');
  return json({ ok: true, ...(isLocalDevelopment() && !delivery.delivered ? { devToken: token } : {}) });
}
