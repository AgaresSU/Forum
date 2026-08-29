import { consumeAuthToken, findAuthToken, recordSecurityEvent, setTelegram } from '@/lib/auth/database';
import { json } from '@/lib/auth/http';
import { getRequestUser } from '@/lib/auth/session';
import { z } from 'zod';

const schema = z.object({ code: z.string().trim().regex(/^\d{8}$/u) });

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ ok: false, message: 'Требуется вход' }, 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, message: 'Введите 8-значный код привязки' }, 400);
  const token = await findAuthToken('telegram_link', parsed.data.code, user.id);
  if (!token) return json({ ok: false, message: 'Код привязки недействителен или истёк' }, 400);
  await consumeAuthToken(token.id);
  await setTelegram(user.id, `dev:${user.id}`, 'local_test_bot');
  await recordSecurityEvent(user.id, 'telegram_enabled', { mode: 'local' });
  return json({ ok: true });
}
