import Link from 'next/link';
import {
  ArrowRight,
  BookMarked,
  CheckCircle2,
  FileText,
  GitBranch,
  Lock,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import { listEditorialContent } from '@/lib/forum/content-repository';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

function materialCount(value: number) {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${value} материалов`;
  if (last === 1) return `${value} материал`;
  if (last >= 2 && last <= 4) return `${value} материала`;
  return `${value} материалов`;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireCommunityUser();
  const [manuals, queryParams] = await Promise.all([
    listEditorialContent('manual', user),
    searchParams,
  ]);
  const query = (queryParams.q || '').trim();
  const normalizedQuery = query.toLocaleLowerCase('ru');
  const visibleManuals = normalizedQuery
    ? manuals.filter((manual) =>
        `${manual.title} ${manual.summary} ${manual.category} ${manual.author}`
          .toLocaleLowerCase('ru')
          .includes(normalizedQuery),
      )
    : manuals;
  const categoryCounts = [
    ...manuals.reduce((counts, manual) => {
      counts.set(manual.category, (counts.get(manual.category) || 0) + 1);
      return counts;
    }, new Map<string, number>()),
  ].sort((left, right) => right[1] - left[1]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active="library"
      />
      <main className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">
              Версионные материалы сообщества
            </p>
            <h1 className="mt-2 font-heading text-4xl font-bold tracking-[-0.045em]">
              База знаний
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Мануалы хранятся в D1 отдельно от форумной переписки, получают
              редакции и сохраняют связанную тему для вопросов и обновлений.
            </p>
          </div>
          <form action="/library" method="get" className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="library-search" className="sr-only">
              Поиск по базе знаний
            </label>
            <input
              id="library-search"
              name="q"
              defaultValue={query}
              placeholder="Найти инструкцию или инструмент"
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/10"
            />
          </form>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categoryCounts.slice(0, 4).map(([title, count]) => (
            <article
              key={title}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <BookMarked className="size-4 text-emerald-ink" />
              <h2 className="mt-4 font-heading font-bold">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {materialCount(count)}
              </p>
            </article>
          ))}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <header className="flex items-center justify-between gap-4 border-b border-border bg-muted/45 px-5 py-4">
              <h2 className="font-heading font-bold">
                {query
                  ? `Результаты по запросу «${query}»`
                  : 'Недавно обновлённые'}
              </h2>
              <span className="text-xs font-semibold text-muted-foreground">
                {visibleManuals.length}
              </span>
            </header>
            {visibleManuals.length ? (
              visibleManuals.map((manual) => (
                <article
                  key={manual.id}
                  className="flex flex-col gap-4 border-t border-border px-5 py-4 first:border-t-0 sm:flex-row sm:items-center"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-soft text-emerald-ink">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading font-bold">{manual.title}</h3>
                      {manual.access === 'pro' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-2 py-0.5 text-[9px] font-bold text-violet-ink">
                          <Lock className="size-2.5" /> PRO
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {manual.category} · редакция {manual.revision} · обновлено{' '}
                      {manual.updated}
                    </p>
                  </div>
                  <Link
                    href={`/library/${manual.slug}`}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary"
                  >
                    {manual.locked ? 'Посмотреть описание' : 'Открыть материал'}{' '}
                    <ArrowRight className="size-3" />
                  </Link>
                </article>
              ))
            ) : (
              <div className="px-5 py-14 text-center">
                <Search className="mx-auto size-6 text-muted-foreground" />
                <h3 className="mt-3 font-heading font-bold">
                  Материалы не найдены
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Измените запрос или вернитесь к полному списку.
                </p>
                <Link
                  href="/library"
                  className="mt-4 inline-flex text-sm font-bold text-primary"
                >
                  Сбросить поиск
                </Link>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-violet-ink" />
                <h2 className="font-heading text-sm font-bold">
                  Редакции и изменения
                </h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Номер редакции и время обновления берутся из записи материала.
                Полная история версий будет следующим этапом.
              </p>
            </section>
            <section className="rounded-2xl border border-emerald-ink/15 bg-emerald-soft p-5 text-emerald-ink">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                <h2 className="font-heading text-sm font-bold">
                  Редакционный стандарт
                </h2>
              </div>
              <p className="mt-2 text-xs leading-5 opacity-80">
                Условия, версии, безопасный откат, проверяемый результат и
                связанная тема обязательны для публикации.
              </p>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-amber-ink" />
                <h2 className="font-heading text-sm font-bold">
                  Проверка безопасности
                </h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Команды, меняющие данные или конфигурацию, должны явно указывать
                область действия и резервное копирование.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
