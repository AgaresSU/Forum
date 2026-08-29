import { enforceRateLimit } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { decodeRouteValue } from '@/lib/forum/access';
import { requireForumApiUser } from '@/lib/forum/api';
import { reviewPartnerProgram } from '@/lib/forum/partner-programs';
import { partnerProgramReviewSchema } from '@/lib/forum/policy';

const errors = {
  ACCESS_DENIED: ['Раздел доступен только администраторам', 403],
  NOT_FOUND: ['Партнёрская программа не найдена', 404],
} as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = partnerProgramReviewSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  if (!(await enforceRateLimit(`partner-review:${auth.user.id}`, 120, 3600))) {
    return json(
      { ok: false, message: 'Лимит действий проверки временно исчерпан' },
      429,
    );
  }
  const { id } = await context.params;
  const result = await reviewPartnerProgram(
    auth.user,
    decodeRouteValue(id),
    parsed.data.status,
    parsed.data.note,
  );
  if (!result.ok) {
    const [message, status] = errors[result.code];
    return json({ ok: false, message }, status);
  }
  return json(result);
}
