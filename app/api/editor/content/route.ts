import { enforceRateLimit } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { requireForumApiUser } from '@/lib/forum/api';
import { createEditorialRecord } from '@/lib/forum/editorial-workflow';
import { editorialCreateSchema } from '@/lib/forum/policy';

const editorialErrors = {
  ACCESS_DENIED: {
    message: 'Редактор доступен авторам, экспертам и команде форума',
    status: 403,
  },
  DISCUSSION_NOT_FOUND: {
    message: 'Связанная тема не найдена',
    status: 404,
  },
  DISCUSSION_ACCESS_DENIED: {
    message: 'Нет доступа к выбранной теме обсуждения',
    status: 403,
  },
  DISCUSSION_ACCESS_MISMATCH: {
    message: 'Открытый материал нельзя связать с темой уровня PRO',
    status: 400,
  },
} as const;

export async function POST(request: Request) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = editorialCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  if (!(await enforceRateLimit(`editorial-create:${auth.user.id}`, 20, 3600))) {
    return json(
      {
        ok: false,
        message: 'Лимит новых материалов исчерпан. Попробуйте позже.',
      },
      429,
    );
  }

  const result = await createEditorialRecord(auth.user, parsed.data);
  if (!result.ok) {
    const error = editorialErrors[result.code];
    return json({ ok: false, message: error.message }, error.status);
  }
  return json(result, 201);
}
