import { json, validationError } from '@/lib/auth/http';
import { requireForumApiUser } from '@/lib/forum/api';
import { moderationActionSchema } from '@/lib/forum/policy';
import { resolveModerationReport } from '@/lib/forum/repository';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = moderationActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  if (
    parsed.data.action !== 'resolve' &&
    parsed.data.action !== 'dismiss' &&
    parsed.data.action !== 'claim'
  ) {
    return json({ ok: false, message: 'Недопустимое действие' }, 400);
  }
  const { id } = await context.params;
  const result = await resolveModerationReport(
    auth.user,
    id,
    parsed.data.action,
    parsed.data.note,
  );
  if (!result.ok) {
    const message =
      result.code === 'ACCESS_DENIED'
        ? 'Недостаточно прав'
        : result.code === 'ALREADY_ASSIGNED'
          ? 'Жалоба уже назначена другому модератору'
          : 'Жалоба не найдена';
    return json(
      { ok: false, message },
      result.code === 'NOT_FOUND' ? 404 : 403,
    );
  }
  return json({ ok: true });
}
