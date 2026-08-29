import { json, validationError } from '@/lib/auth/http';
import { decodeRouteValue } from '@/lib/forum/access';
import { requireForumApiUser } from '@/lib/forum/api';
import { topicResubmissionSchema } from '@/lib/forum/policy';
import { resubmitTopic } from '@/lib/forum/repository';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = topicResubmissionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  const params = await context.params;
  const result = await resubmitTopic(
    auth.user,
    decodeRouteValue(params.slug),
    parsed.data,
  );
  if (!result.ok) {
    const messages = {
      NOT_FOUND: 'Тема не найдена',
      ACCESS_DENIED: 'Только автор может повторно отправить тему',
      INVALID_STATUS: 'Повторная отправка доступна только после отклонения',
      DISCLOSURE_REQUIRED: 'Обновите раскрытие коммерческой заинтересованности',
    };
    return json(
      { ok: false, message: messages[result.code] },
      result.code === 'NOT_FOUND' ? 404 : 403,
    );
  }
  return json({ ok: true, status: result.status });
}
