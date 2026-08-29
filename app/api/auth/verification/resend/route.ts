import { numericCode } from '@/lib/auth/crypto';
import { createAuthToken, deleteTokens, getUserByEmail } from '@/lib/auth/database';
import { sendAuthEmail } from '@/lib/auth/email';
import { isLocalDevelopment, json, validationError } from '@/lib/auth/http';
import { resetRequestSchema } from '@/lib/auth/schemas';

export async function POST(request: Request) {
  const parsed = resetRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const user = await getUserByEmail(parsed.data.email);
  if (!user || user.email_verified_at) return json({ ok: true });
  const code = numericCode();
  await deleteTokens(user.id, 'verify_email');
  await createAuthToken({ userId: user.id, purpose: 'verify_email', token: code, ttlSeconds: 15 * 60 });
  const delivery = await sendAuthEmail({ to: user.email, kind: 'verify_email', code });
  return json({ ok: true, ...(isLocalDevelopment() && !delivery.delivered ? { devCode: code } : {}) });
}
