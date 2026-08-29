import { ForumHome } from '@/components/forum-home';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

export default async function ForumPage() {
  const user = await requireCommunityUser();
  return <ForumHome username={user.username} role={user.role} />;
}
