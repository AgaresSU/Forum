import type { AuthUserRow } from '@/lib/auth/database';
import { json } from '@/lib/auth/http';
import { getRequestUser } from '@/lib/auth/session';
import { ensureCommunitySchema } from '@/lib/forum/database';

type ForumApiAuth =
  | { user: AuthUserRow; error?: never }
  | { user?: never; error: Response };

export async function requireForumApiUser(
  request: Request,
): Promise<ForumApiAuth> {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (
    (origin && origin !== new URL(request.url).origin) ||
    fetchSite === 'cross-site'
  ) {
    return {
      error: json(
        { ok: false, message: 'Запрос отклонён проверкой источника' },
        403,
      ),
    };
  }

  const user = await getRequestUser(request);
  if (!user)
    return {
      error: json({ ok: false, message: 'Требуется авторизация' }, 401),
    };
  await ensureCommunitySchema();
  return { user };
}
