import { enforceRateLimit } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { requireForumApiUser } from '@/lib/forum/api';
import { moderationReportSchema } from '@/lib/forum/policy';
import { createModerationReport } from '@/lib/forum/repository';

export async function POST(request: Request) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = moderationReportSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  if (!(await enforceRateLimit(`forum-report:${auth.user.id}`, 20, 60 * 60))) {
    return json(
      { ok: false, message: 'Лимит жалоб исчерпан. Попробуйте позже.' },
      429,
    );
  }
  const report = await createModerationReport(auth.user, parsed.data);
  if (!report.ok) {
    const message =
      report.code === 'ACCESS_DENIED'
        ? 'Недостаточно прав для просмотра объекта'
        : report.code === 'NOT_FOUND'
          ? 'Объект жалобы не найден'
          : 'Этот тип жалобы пока не поддерживается';
    return json(
      { ok: false, message },
      report.code === 'ACCESS_DENIED' ? 403 : 404,
    );
  }
  return json({ ok: true, reportId: report.id }, 201);
}
