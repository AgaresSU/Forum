import { consumeAuthToken, findAuthToken, recordSecurityEvent, setTelegram } from '@/lib/auth/database';
import { json } from '@/lib/auth/http';
import { sendTelegramMessage } from '@/lib/auth/telegram';

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
    from?: { username?: string };
  };
};

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && request.headers.get('x-telegram-bot-api-secret-token') !== expectedSecret) {
    return json({ ok: false }, 401);
  }
  if (process.env.NODE_ENV === 'production' && !expectedSecret) return json({ ok: false, message: 'Webhook secret is required' }, 503);

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const match = update?.message?.text?.match(/^\/start\s+(\d{8})$/u);
  const chatId = update?.message?.chat?.id;
  if (!match || chatId === undefined) return json({ ok: true });
  const token = await findAuthToken('telegram_link', match[1]);
  if (!token) return json({ ok: true });

  await consumeAuthToken(token.id);
  await setTelegram(token.user_id, String(chatId), update?.message?.from?.username || null);
  await recordSecurityEvent(token.user_id, 'telegram_enabled', { mode: 'bot' });
  await sendTelegramMessage(String(chatId), 'Telegram успешно подключён к аккаунту «Основы».');
  return json({ ok: true });
}
