import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSessionUser } from '@/lib/auth/session';
import { ensureCommunitySchema } from '@/lib/forum/database';

export async function requireCommunityUser() {
  const requestHeaders = await headers();
  const user = await getSessionUser(requestHeaders.get('cookie'));
  if (!user) redirect('/auth?mode=login');
  await ensureCommunitySchema();
  return user;
}
