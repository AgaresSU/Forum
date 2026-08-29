import { json } from '@/lib/auth/http';
import { getRequestUser, publicUser } from '@/lib/auth/session';

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ ok: false, message: 'Требуется вход' }, 401);
  return json({ ok: true, user: publicUser(user) });
}
