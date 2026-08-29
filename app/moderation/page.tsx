import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import { ModerationQueue } from '@/components/moderation-queue';
import { buttonVariants } from '@/components/ui/button';
import { canModerate } from '@/lib/forum/access';
import { requireCommunityUser } from '@/lib/forum/require-community-user';
import { listModerationQueue } from '@/lib/forum/repository';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  const user = await requireCommunityUser();

  if (!canModerate(user.role)) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <CommunityHeader
          username={user.username}
          userId={user.id}
          role={user.role}
          active="moderation"
        />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-5 font-heading text-3xl font-bold">
            Раздел доступен модераторам
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Очередь содержит неопубликованные материалы и жалобы участников,
            поэтому доступ проверяется на сервере.
          </p>
          <Link href="/forum" className={buttonVariants({ className: 'mt-6' })}>
            Вернуться на форум
          </Link>
        </main>
      </div>
    );
  }

  const queue = await listModerationQueue(user);
  if (!queue) throw new Error('Moderation queue is unavailable');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active="moderation"
      />
      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">
              Служебный раздел
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold tracking-[-0.04em]">
              Очередь модерации
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Премодерация публикаций и обработка жалоб в одном рабочем контуре.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            Модератор:{' '}
            <strong className="text-foreground">{user.username}</strong>
          </div>
        </div>
        <ModerationQueue
          initialTopics={queue.topics}
          initialReports={queue.reports}
          initialHistory={queue.history}
          moderatorName={user.username}
          isAdmin={user.role === 'admin'}
        />
      </main>
    </div>
  );
}
