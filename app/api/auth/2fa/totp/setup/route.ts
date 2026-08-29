import QRCode from 'qrcode';

import { encryptSecret, generateTotpSecret, totpUri } from '@/lib/auth/crypto';
import { recordSecurityEvent, setPendingTotp } from '@/lib/auth/database';
import { json } from '@/lib/auth/http';
import { getRequestUser } from '@/lib/auth/session';

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ ok: false, message: 'Требуется вход' }, 401);
  const secret = generateTotpSecret();
  await setPendingTotp(user.id, await encryptSecret(secret));
  const uri = totpUri(secret, user.email);
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 260, margin: 1, color: { dark: '#153b2e', light: '#ffffff' } });
  await recordSecurityEvent(user.id, 'totp_setup_started');
  return json({ ok: true, secret, qrDataUrl });
}
