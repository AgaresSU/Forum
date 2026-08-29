import { decryptSecret, verifyTotp } from '@/lib/auth/crypto';
import { enableTotp, getUserById, recordSecurityEvent } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { codeSchema } from '@/lib/auth/schemas';
import { getRequestUser } from '@/lib/auth/session';
import { z } from 'zod';

const schema = z.object({ code: codeSchema });

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ ok: false, message: 'Требуется вход' }, 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const freshUser = await getUserById(user.id);
  if (!freshUser?.totp_secret_encrypted) return json({ ok: false, message: 'Сначала создайте секрет TOTP' }, 400);
  const valid = await verifyTotp(await decryptSecret(freshUser.totp_secret_encrypted), parsed.data.code);
  if (!valid) return json({ ok: false, message: 'Код не подошёл. Проверьте время на телефоне.' }, 400);
  await enableTotp(user.id);
  await recordSecurityEvent(user.id, 'totp_enabled');
  return json({ ok: true });
}
