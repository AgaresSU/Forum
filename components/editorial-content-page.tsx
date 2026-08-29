import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  ExternalLink,
  GitBranch,
  Lock,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import { buttonVariants } from '@/components/ui/button';
import type { EditorialContentRecord } from '@/lib/forum/content-repository';

type EditorialUser = {
  id: string;
  username: string;
  role: string;
};

export async function EditorialContentPage({
  record,
  user,
}: {
  record: EditorialContentRecord;
  user: EditorialUser;
}) {
  const isManual = record.contentType === 'manual';
  const indexHref = isManual ? '/library' : '/journal';
  const indexLabel = isManual ? 'База знаний' : 'Журнал';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active={isManual ? 'library' : 'journal'}
      />
      <main className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8">
        <Link
          href={indexHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {indexLabel}
        </Link>

        <header className="mt-7 max-w-4xl border-b border-border pb-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-strong">
              {record.category}
            </span>
            {record.access === 'pro' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-2 py-1 text-[9px] font-bold text-violet-ink">
                <Lock className="size-2.5" /> PRO
              </span>
            )}
            {record.commercial && (
              <span className="rounded-full bg-amber-soft px-2 py-1 text-[9px] font-bold text-amber-ink">
                Коммерческий контекст
              </span>
            )}
          </div>
          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">
            {record.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            {record.summary}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-3.5" /> {record.author}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" /> {record.readingMinutes} мин.
              чтения
            </span>
            <span>Опубликовано {record.published}</span>
          </div>
        </header>

        {record.locked ? (
          <section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-violet-ink/15 bg-violet-soft p-8 text-center text-violet-ink">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-background/70">
              <Lock className="size-5" />
            </div>
            <h2 className="mt-5 font-heading text-2xl font-bold">
              Материал доступен участникам PRO
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 opacity-80">
              Заголовок и описание видны в каталоге, но полный текст защищён
              серверной проверкой роли.
            </p>
            <Link
              href="/access"
              className={buttonVariants({
                variant: 'outline',
                className:
                  'mt-6 border-violet-ink/20 bg-background text-foreground',
              })}
            >
              Посмотреть уровни доступа
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <article className="rounded-2xl border border-border bg-card px-5 py-7 sm:px-8 sm:py-9">
              {record.commercialDisclosure && (
                <div className="mb-7 flex gap-3 rounded-2xl border border-amber-ink/15 bg-amber-soft p-4 text-sm leading-6 text-amber-ink">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                  <p>
                    <strong className="block font-heading">
                      Раскрытие заинтересованности
                    </strong>
                    <span className="mt-1 block opacity-85">
                      {record.commercialDisclosure}
                    </span>
                  </p>
                </div>
              )}
              <div className="space-y-6 text-[15px] leading-8 sm:text-base">
                {record.body.map((paragraph, index) => (
                  <p key={`${record.id}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </article>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <section className="rounded-2xl border border-border bg-card p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                  Карточка материала
                </p>
                <dl className="mt-4 space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="inline-flex items-center gap-2 text-muted-foreground">
                      <GitBranch className="size-3.5" /> Редакция
                    </dt>
                    <dd className="font-semibold">{record.revision}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="inline-flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="size-3.5" /> Тип
                    </dt>
                    <dd className="font-semibold">
                      {isManual ? 'Мануал' : 'Статья'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Обновлено</dt>
                    <dd className="font-semibold">{record.updated}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-emerald-ink/15 bg-emerald-soft p-5 text-emerald-ink">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-4" />
                  <h2 className="font-heading text-sm font-bold">
                    Живое обсуждение
                  </h2>
                </div>
                <p className="mt-2 text-xs leading-5 opacity-80">
                  Вопросы и практический опыт остаются в связанной теме форума,
                  даже когда материал получает новую редакцию.
                </p>
                {record.discussionSlug && (
                  <Link
                    href={`/forum/topic/${record.discussionSlug}`}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold underline-offset-4 hover:underline"
                  >
                    Перейти к обсуждению <ExternalLink className="size-3" />
                  </Link>
                )}
              </section>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
