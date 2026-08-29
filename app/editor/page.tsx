import Link from 'next/link';
import {
  ArrowRight,
  FilePenLine,
  FilePlus2,
  LockKeyhole,
  MessageSquareText,
} from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  canUseEditorialWorkspace,
  listEditorialWorkspace,
} from '@/lib/forum/editorial-workflow';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  pending: 'На проверке',
  published: 'Опубликовано',
  rejected: 'На доработке',
};

export default async function EditorialWorkspacePage() {
  const user = await requireCommunityUser();
  const allowed = canUseEditorialWorkspace(user.role);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <CommunityHeader
          username={user.username}
          userId={user.id}
          role={user.role}
          active="editor"
        />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <LockKeyhole className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-5 font-heading text-3xl font-bold">
            Редактор доступен авторам
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Права автора или эксперта выдаёт команда форума после проверки
            профиля. Обычные участники читают опубликованные материалы в журнале
            и базе знаний.
          </p>
          <Link href="/forum" className={buttonVariants({ className: 'mt-6' })}>
            Вернуться на форум
          </Link>
        </main>
      </div>
    );
  }

  const records = await listEditorialWorkspace(user);
  if (!records) throw new Error('Editorial workspace is unavailable');
  const pendingCount = records.filter(
    (record) => record.workflow_status === 'pending',
  ).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active="editor"
      />
      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">
              Редакционный контур
            </p>
            <h1 className="mt-2 font-heading text-4xl font-bold tracking-[-0.045em]">
              Материалы и версии
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Черновики, проверка редакции, публикация и восстановление прошлых
              версий. Обсуждения остаются на форуме и связываются с материалом.
            </p>
          </div>
          <Link href="/editor/new" className={buttonVariants({ size: 'lg' })}>
            <FilePlus2 data-icon="inline-start" /> Новый материал
          </Link>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground">
              В рабочем контуре
            </p>
            <p className="mt-2 font-heading text-3xl font-bold">
              {records.length}
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground">
              Ожидают проверки
            </p>
            <p className="mt-2 font-heading text-3xl font-bold">
              {pendingCount}
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground">
              Ваша роль
            </p>
            <p className="mt-2 font-heading text-lg font-bold">{user.role}</p>
          </article>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <header className="flex items-center justify-between gap-4 border-b border-border bg-muted/45 px-5 py-4">
            <h2 className="font-heading font-bold">Рабочая очередь</h2>
            <span className="text-xs text-muted-foreground">
              {user.role === 'moderator' || user.role === 'admin'
                ? 'Все авторы'
                : 'Только ваши материалы'}
            </span>
          </header>
          {records.length ? (
            records.map((record) => (
              <article
                key={record.id}
                className="grid gap-4 border-t border-border px-5 py-4 first:border-t-0 md:grid-cols-[minmax(0,1fr)_180px_36px] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <FilePenLine className="size-4 text-primary" />
                    <Link
                      href={`/editor/${record.id}`}
                      className="truncate font-heading font-bold hover:text-primary"
                    >
                      {record.title}
                    </Link>
                    <Badge variant="outline">
                      {record.content_type === 'article' ? 'Статья' : 'Мануал'}
                    </Badge>
                    <Badge
                      variant={
                        record.workflow_status === 'published'
                          ? 'default'
                          : record.workflow_status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {statusLabels[record.workflow_status] ||
                        record.workflow_status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {record.author} · v{record.revision} · редактор{' '}
                    {record.editor} · {record.created}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {record.discussion_slug ? (
                    <Link
                      href={`/forum/topic/${record.discussion_slug}`}
                      className="inline-flex max-w-full items-center gap-1 hover:text-primary"
                    >
                      <MessageSquareText className="size-3.5 shrink-0" />
                      <span className="truncate">Обсуждение</span>
                    </Link>
                  ) : (
                    'Без обсуждения'
                  )}
                </div>
                <Link
                  href={`/editor/${record.id}`}
                  aria-label={`Редактировать ${record.title}`}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary"
                >
                  <ArrowRight className="size-4" />
                </Link>
              </article>
            ))
          ) : (
            <div className="px-5 py-14 text-center">
              <FilePlus2 className="mx-auto size-7 text-muted-foreground" />
              <h3 className="mt-4 font-heading font-bold">
                Материалов пока нет
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Создайте первый черновик статьи или мануала.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
