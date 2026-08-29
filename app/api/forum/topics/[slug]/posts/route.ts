import { enforceRateLimit } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { requireForumApiUser } from '@/lib/forum/api';
import { decodeRouteValue } from '@/lib/forum/access';
import { replyDraftSchema } from '@/lib/forum/policy';
import { addTopicPost } from '@/lib/forum/repository';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = replyDraftSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  if (!(await enforceRateLimit(`forum-reply:${auth.user.id}`, 30, 10 * 60))) {
    return json(
      {
        ok: false,
        message: 'Слишком много ответов. Сделайте небольшую паузу.',
      },
      429,
    );
  }

  const routeParams = await context.params;
  const slug = decodeRouteValue(routeParams.slug);
  const result = await addTopicPost(auth.user, slug, parsed.data.body);
  if (!result.ok) {
    const messages = {
      TOPIC_NOT_FOUND: 'Тема не найдена',
      ACCESS_DENIED: 'Недостаточно прав для ответа',
      TOPIC_PENDING: 'Тема ещё находится на модерации',
      TOPIC_LOCKED: 'Обсуждение закрыто модератором',
    };
    return json(
      { ok: false, message: messages[result.code] },
      result.code === 'TOPIC_NOT_FOUND' ? 404 : 403,
    );
  }
  return json({ ok: true, postId: result.postId }, 201);
}
