import { enforceRateLimit } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { decodeRouteValue } from '@/lib/forum/access';
import { requireForumApiUser } from '@/lib/forum/api';
import { userDeleteSchema } from '@/lib/forum/policy';
import { deleteManagedUser } from '@/lib/forum/user-administration';

const errors = {
  ACCESS_DENIED: ['Раздел доступен только администраторам', 403],
  NOT_FOUND: ['Пользователь не найден', 404],
  SYSTEM_ACCOUNT: ['Служебную запись контента удалять нельзя', 403],
  SELF_DELETE: ['Нельзя удалить собственный аккаунт', 409],
  LAST_ADMIN: ['Нельзя удалить последнего администратора', 409],
  HAS_ACTIVITY: [
    'У пользователя есть публикации или действия. Сначала передайте их другому владельцу.',
    409,
  ],
} as const;

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = userDeleteSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  if (!(await enforceRateLimit(`admin-users:${auth.user.id}`, 120, 3600))) {
    return json(
      { ok: false, message: 'Лимит административных действий исчерпан' },
      429,
    );
  }
  const { id } = await context.params;
  const result = await deleteManagedUser(
    auth.user,
    decodeRouteValue(id),
    parsed.data.note,
  );
  if (!result.ok) {
    const [message, status] = errors[result.code];
    return json({ ok: false, message }, status);
  }
  return json(result);
}
