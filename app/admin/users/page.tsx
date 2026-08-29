import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

import {
  UserManagement,
  type ManagedUser,
} from '@/components/admin/user-management';
import { AdminNavigation } from '@/components/admin/admin-navigation';
import { CommunityHeader } from '@/components/community-header';
import { buttonVariants } from '@/components/ui/button';
import { requireCommunityUser } from '@/lib/forum/require-community-user';
import { listManagedUsers } from '@/lib/forum/user-administration';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const user = await requireCommunityUser();
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <CommunityHeader
          username={user.username}
          userId={user.id}
          role={user.role}
          active="admin"
        />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-5 font-heading text-3xl font-bold">
            Раздел администратора
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Управление системными ролями и аккаунтами доступно только
            администраторам.
          </p>
          <Link href="/forum" className={buttonVariants({ className: 'mt-6' })}>
            Вернуться на форум
          </Link>
        </main>
      </div>
    );
  }
  const data = await listManagedUsers(user);
  if (!data) throw new Error('User administration is unavailable');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active="admin"
      />
      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">
            Системный доступ
          </p>
          <h1 className="mt-2 font-heading text-4xl font-bold tracking-[-0.045em]">
            Пользователи и роли
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Назначение авторов, экспертов, PRO, модераторов и администраторов.
            Себя и последнего администратора изменить или удалить нельзя.
          </p>
          <AdminNavigation active="users" />
        </header>

        <div className="mt-6">
          <UserManagement
            users={data.users as ManagedUser[]}
            currentUserId={user.id}
          />
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <header className="border-b border-border bg-muted/45 px-5 py-4">
            <h2 className="font-heading font-bold">
              Журнал административных действий
            </h2>
          </header>
          {data.audit.length ? (
            <ol className="divide-y divide-border">
              {data.audit.map((entry) => (
                <li key={entry.id} className="px-5 py-4 text-sm">
                  <strong>{entry.actor || 'Удалённый администратор'}</strong>{' '}
                  {entry.action === 'user_deleted'
                    ? 'удалил аккаунт'
                    : 'изменил роль'}{' '}
                  <strong>{entry.target_username}</strong>
                  {entry.action === 'role_changed' && (
                    <span>
                      {' '}
                      · {entry.previous_role} → {entry.new_role}
                    </span>
                  )}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {entry.created}
                  </span>
                  {entry.note && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Административных действий пока нет.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
