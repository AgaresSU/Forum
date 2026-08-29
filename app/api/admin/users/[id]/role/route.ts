import { enforceRateLimit } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { decodeRouteValue } from '@/lib/forum/access';
import { requireForumApiUser } from '@/lib/forum/api';
import { userRoleChangeSchema } from '@/lib/forum/policy';
import { changeManagedUserRole } from '@/lib/forum/user-administration';

const errors = {
  ACCESS_DENIED: ['Раздел доступен только администраторам', 403],
  INVALID_ROLE: ['Неизвестная роль', 400],
  NOT_FOUND: ['Пользователь не найден', 404],
  SYSTEM_ACCOUNT: ['Служебную запись контента изменять нельзя', 403],
  SELF_CHANGE: ['Нельзя изменить собственную роль', 409],
  LAST_ADMIN: ['Нельзя снять роль у последнего администратора', 409],
} as const;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = userRoleChangeSchema.safeParse(
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
  const result = await changeManagedUserRole(
    auth.user,
    decodeRouteValue(id),
    parsed.data.role,
    parsed.data.note,
  );
  if (!result.ok) {
    const [message, status] = errors[result.code];
    return json({ ok: false, message }, status);
  }
  return json(result);
}
