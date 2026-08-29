export async function sendTelegramMessage(chatId: string, message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || chatId.startsWith('dev:')) return { delivered: false as const };
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
  if (!response.ok) throw new Error('Telegram delivery failed');
  return { delivered: true as const };
}

export function telegramBotUrl(linkToken: string) {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  return username ? `https://t.me/${username.replace(/^@/u, '')}?start=${encodeURIComponent(linkToken)}` : null;
}
