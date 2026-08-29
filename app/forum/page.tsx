import { ForumHome } from '@/components/forum-home';
import { findForum } from '@/lib/forum/catalog';
import { canAccessRole } from '@/lib/forum/access';
import { getUnreadNotificationCount } from '@/lib/forum/notifications';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ compose?: string; forum?: string }>;
}) {
  const user = await requireCommunityUser();
  const unreadCount = await getUnreadNotificationCount(user.id);
  const query = await searchParams;
  const selectedForum = query.forum ? findForum(query.forum) : null;
  const initialForum =
    selectedForum && canAccessRole(user.role, selectedForum.forum.access)
      ? selectedForum.forum.slug
      : 'development';
  return (
    <ForumHome
      username={user.username}
      role={user.role}
      unreadCount={unreadCount}
      initialCompose={query.compose === '1'}
      initialForum={initialForum}
    />
  );
}
