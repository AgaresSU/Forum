import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSessionUser, publicUser } from '@/lib/auth/session';
import { SecurityClient } from './security-client';

export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const requestHeaders = await headers();
  const user = await getSessionUser(requestHeaders.get('cookie'));
  if (!user) redirect('/auth?mode=login');
  return <SecurityClient initialUser={publicUser(user)} />;
}
