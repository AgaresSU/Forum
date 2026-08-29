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
  if (parsed.data.action !== 'resolve' && parsed.data.action !== 'dismiss') {
    return json({ ok: false, message: 'Недопустимое действие' }, 400);
  }
  const { id } = await context.params;
  const result = await resolveModerationReport(
    auth.user,
    id,
    parsed.data.action,
  );
  if (!result.ok) {
    return json(
      {
        ok: false,
        message:
          result.code === 'ACCESS_DENIED'
            ? 'Недостаточно прав'
            : 'Жалоба не найдена',
      },
      result.code === 'ACCESS_DENIED' ? 403 : 404,
    );
  }
  return json({ ok: true });
}
