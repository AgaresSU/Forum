import { enforceRateLimit } from '@/lib/auth/database';
import { json, validationError } from '@/lib/auth/http';
import { requireForumApiUser } from '@/lib/forum/api';
import { createPartnerProgram } from '@/lib/forum/partner-programs';
import { partnerProgramCreateSchema } from '@/lib/forum/policy';

export async function POST(request: Request) {
  const auth = await requireForumApiUser(request);
  if (auth.error) return auth.error;
  const parsed = partnerProgramCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  if (!(await enforceRateLimit(`partner-program:${auth.user.id}`, 12, 3600))) {
    return json(
      { ok: false, message: 'Лимит отправки программ временно исчерпан' },
      429,
    );
  }
  const result = await createPartnerProgram(auth.user, parsed.data);
  if (!result.ok) {
    return json(
      {
        ok: false,
        message: 'Добавлять программы могут партнёры и администраторы',
      },
      403,
    );
  }
  return json(result, 201);
}
