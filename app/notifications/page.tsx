import { CommunityHeader } from '@/components/community-header';
import { NotificationCenter } from '@/components/notification-center';
import { listNotifications } from '@/lib/forum/notifications';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await requireCommunityUser();
  const notifications = await listNotifications(user.id);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active="forum"
      />
      <main className="mx-auto max-w-[980px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 border-b border-border pb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">
            Личный центр
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-[-0.04em]">
            Уведомления
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ответы, упоминания, подписанные разделы и решения модераторов.
          </p>
        </header>
        <NotificationCenter initialItems={notifications} />
      </main>
    </div>
  );
}
