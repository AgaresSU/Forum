import { enforceRateLimit } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { decodeRouteValue } from '@/lib/forum/access';
import { requireForumApiUser } from '@/lib/forum/api';
import { appendEditorialRevision } from '@/lib/forum/editorial-workflow';
import { editorialRevisionSchema } from '@/lib/forum/policy';

const editorialErrors = {
  ACCESS_DENIED: ['Недостаточно прав для изменения материала', 403],
  PUBLISH_DENIED: [
    'Публиковать и возвращать материалы может только редакция',
    403,
  ],
  NOT_FOUND: ['Материал не найден', 404],
  INVALID_STATUS: ['Вернуть можно только материал, ожидающий проверки', 409],
  DISCUSSION_NOT_FOUND: ['Связанная тема не найдена', 404],
  DISCUSSION_ACCESS_DENIED: ['Нет доступа к выбранной теме обсуждения', 403],
  DISCUSSION_ACCESS_MISMATCH: [
    'Открытый материал нельзя связать с темой уровня PRO',
    400,
  ],
} as const;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = editorialRevisionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  if (
    !(await enforceRateLimit(`editorial-revision:${auth.user.id}`, 120, 3600))
  ) {
    return json(
      { ok: false, message: 'Слишком много редакций. Сделайте паузу.' },
      429,
    );
  }

  const { id } = await context.params;
  const result = await appendEditorialRevision(
    auth.user,
    decodeRouteValue(id),
    parsed.data.action,
    parsed.data,
  );
  if (!result.ok) {
    const [message, status] = editorialErrors[result.code];
    return json({ ok: false, message }, status);
  }
  return json(result);
}
