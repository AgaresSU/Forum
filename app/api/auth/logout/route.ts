import { json } from '@/lib/auth/http';
import { clearSessionCookie, revokeRequestSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  await revokeRequestSession(request);
  return json({ ok: true }, { headers: { 'set-cookie': clearSessionCookie() } });
}
