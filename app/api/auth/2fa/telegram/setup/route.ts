import { numericCode } from '@/lib/auth/crypto';
import { createAuthToken, deleteTokens, recordSecurityEvent } from '@/lib/auth/database';
import { isLocalDevelopment, json } from '@/lib/auth/http';
import { getRequestUser } from '@/lib/auth/session';
import { telegramBotUrl } from '@/lib/auth/telegram';

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ ok: false, message: 'Требуется вход' }, 401);
  const linkToken = numericCode(8);
  await deleteTokens(user.id, 'telegram_link');
  await createAuthToken({ userId: user.id, purpose: 'telegram_link', token: linkToken, ttlSeconds: 15 * 60 });
  const botUrl = telegramBotUrl(linkToken);
  await recordSecurityEvent(user.id, 'telegram_link_started');
  return json({
    ok: true,
    mode: botUrl ? 'bot' : 'local',
    botUrl,
    ...(isLocalDevelopment() && !botUrl ? { devCode: linkToken } : {}),
  });
}
