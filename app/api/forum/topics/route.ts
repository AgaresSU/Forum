import { enforceRateLimit } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { requireForumApiUser } from '@/lib/forum/api';
import { topicDraftSchema } from '@/lib/forum/policy';
import { createTopic } from '@/lib/forum/repository';

export async function POST(request: Request) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = topicDraftSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  if (!(await enforceRateLimit(`forum-topic:${auth.user.id}`, 10, 60 * 60))) {
    return json(
      { ok: false, message: 'Лимит создания тем исчерпан. Попробуйте позже.' },
      429,
    );
  }

  const result = await createTopic(auth.user, parsed.data);
  if (!result.ok) {
    const status = result.code === 'FORUM_NOT_FOUND' ? 404 : 403;
    return json(
      {
        ok: false,
        message:
          result.code === 'FORUM_NOT_FOUND'
            ? 'Раздел не найден'
            : 'Недостаточно прав для этого раздела',
      },
      status,
    );
  }
  return json(
    {
      ok: true,
      topicId: result.topicId,
      slug: result.slug,
      status: result.status,
    },
    201,
  );
}
