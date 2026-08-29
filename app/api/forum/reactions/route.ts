import { enforceRateLimit } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { requireForumApiUser } from '@/lib/forum/api';
import { reactionSchema } from '@/lib/forum/policy';
import { setReaction } from '@/lib/forum/reactions';

const reactionErrors = {
  NOT_FOUND: ['Материал не найден', 404],
  ACCESS_DENIED: ['Материал недоступен для реакции', 403],
  OWN_TARGET: ['Нельзя оценивать собственный материал', 403],
  FIRST_POST_USE_TOPIC: ['Первая публикация оценивается как тема', 400],
} as const;

export async function POST(request: Request) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = reactionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  if (!(await enforceRateLimit(`reaction:${auth.user.id}`, 60, 3600))) {
    return json(
      {
        ok: false,
        message: 'Лимит реакций исчерпан. Вернитесь к оценке материалов позже.',
      },
      429,
    );
  }

  const result = await setReaction(auth.user, parsed.data);
  if (!result.ok) {
    const [message, status] = reactionErrors[result.code];
    return json({ ok: false, message }, status);
  }
  return json(result);
}
