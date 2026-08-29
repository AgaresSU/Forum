import { hashToken, numericCode } from '@/lib/auth/crypto';
import { createAuthToken, deleteTokens, enforceRateLimit, findAuthToken, getUserById } from '@/lib/auth/database';
import { isLocalDevelopment, json } from '@/lib/auth/http';
import { sendTelegramMessage } from '@/lib/auth/telegram';
import { z } from 'zod';

const schema = z.object({ challengeId: z.string().min(20) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, message: 'Сессия входа недействительна' }, 400);
  const challenge = await findAuthToken('login_challenge', parsed.data.challengeId);
  if (!challenge) return json({ ok: false, message: 'Сессия входа истекла' }, 400);
  if (!(await enforceRateLimit(`telegram-code:${challenge.user_id}`, 3, 5 * 60))) {
    return json({ ok: false, message: 'Слишком много кодов. Подождите несколько минут.' }, 429);
  }
  const user = await getUserById(challenge.user_id);
  if (!user?.telegram_enabled || !user.telegram_chat_id) return json({ ok: false, message: 'Telegram не подключён' }, 400);

  const purpose = `telegram_login:${await hashToken(parsed.data.challengeId)}`;
  const code = numericCode();
  await deleteTokens(user.id, purpose);
  await createAuthToken({ userId: user.id, purpose, token: code, ttlSeconds: 5 * 60 });
  const delivery = await sendTelegramMessage(user.telegram_chat_id, `Код входа в «Основу»: ${code}. Он действует 5 минут.`);
  return json({
    ok: true,
    delivery: delivery.delivered ? 'telegram' : 'local',
    ...(isLocalDevelopment() && !delivery.delivered ? { devCode: code } : {}),
  });
}
