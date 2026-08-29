import { getRequestUser } from '@/lib/auth/session';
import { decodeRouteValue } from '@/lib/forum/access';
import { recordPartnerReferralClick } from '@/lib/forum/partner-programs';

function localRedirect(request: Request, path: string, status = 307) {
  return new Response(null, {
    status,
    headers: {
      location: new URL(path, request.url).toString(),
      'cache-control': 'no-store',
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const user = await getRequestUser(request);
  if (!user) return localRedirect(request, '/auth?mode=login');
  const { slug } = await context.params;
  const result = await recordPartnerReferralClick(user, decodeRouteValue(slug));
  if (!result.ok) return localRedirect(request, '/partners');
  return new Response(null, {
    status: 302,
    headers: {
      location: result.url,
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    },
  });
}
