import { json } from '@/lib/auth/http';
import { requireForumApiUser } from '@/lib/forum/api';
import { markAllNotificationsRead } from '@/lib/forum/notifications';

export async function POST(request: Request) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const updated = await markAllNotificationsRead(auth.user.id);
  return json({ ok: true, updated });
}
