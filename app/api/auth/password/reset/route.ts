import { hashPassword } from '@/lib/auth/crypto';
import { consumeAuthToken, findAuthToken, recordSecurityEvent, setPassword } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { resetSchema } from '@/lib/auth/schemas';
import { issueSession, sessionCookie } from '@/lib/auth/session';

export async function POST(request: Request) {
  const parsed = resetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const token = await findAuthToken('password_reset', parsed.data.token);
  if (!token) return json({ ok: false, message: 'Ссылка сброса недействительна или истекла' }, 400);
  await consumeAuthToken(token.id);
  await setPassword(token.user_id, await hashPassword(parsed.data.password));
  await recordSecurityEvent(token.user_id, 'password_reset_completed');
  const session = await issueSession(token.user_id);
  return json({ ok: true, next: '/forum' }, { headers: { 'set-cookie': sessionCookie(session) } });
}
