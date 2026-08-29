import { enforceRateLimit } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { decodeRouteValue } from '@/lib/forum/access';
import { requireForumApiUser } from '@/lib/forum/api';
import { restoreEditorialRevision } from '@/lib/forum/editorial-workflow';
import { editorialRestoreSchema } from '@/lib/forum/policy';

const restoreErrors = {
  ACCESS_DENIED: ['Недостаточно прав для восстановления редакции', 403],
  NOT_FOUND: ['Материал не найден', 404],
  REVISION_NOT_FOUND: ['Редакция не найдена', 404],
} as const;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = editorialRestoreSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  if (
    !(await enforceRateLimit(`editorial-restore:${auth.user.id}`, 30, 3600))
  ) {
    return json(
      {
        ok: false,
        message: 'Лимит восстановлений исчерпан. Попробуйте позже.',
      },
      429,
    );
  }

  const { id } = await context.params;
  const result = await restoreEditorialRevision(
    auth.user,
    decodeRouteValue(id),
    parsed.data.revision,
  );
  if (!result.ok) {
    const [message, status] = restoreErrors[result.code];
    return json({ ok: false, message }, status);
  }
  return json(result);
}
