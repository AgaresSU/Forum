import { json, validationError } from '@/lib/auth/http';
import { requireForumApiUser } from '@/lib/forum/api';
import { subscriptionSchema } from '@/lib/forum/policy';
import { toggleSubscription } from '@/lib/forum/repository';

export async function POST(request: Request) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = subscriptionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  const result = await toggleSubscription(auth.user, parsed.data);
  if (!result.ok) {
    return json(
      {
        ok: false,
        message:
          result.code === 'NOT_FOUND'
            ? 'Объект подписки не найден'
            : 'Недостаточно прав',
      },
      result.code === 'NOT_FOUND' ? 404 : 403,
    );
  }
  return json({ ok: true, subscribed: result.subscribed });
}
