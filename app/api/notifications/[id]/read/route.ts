import { json } from '@/lib/auth/http';
import { decodeRouteValue } from '@/lib/forum/access';
import { requireForumApiUser } from '@/lib/forum/api';
import { markNotificationRead } from '@/lib/forum/notifications';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const params = await context.params;
  const updated = await markNotificationRead(
    auth.user.id,
    decodeRouteValue(params.id),
  );
  if (!updated)
    return json({ ok: false, message: 'Уведомление не найдено' }, 404);
  return json({ ok: true });
}
