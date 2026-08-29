import Link from 'next/link';
import {
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  ClipboardCheck,
  ExternalLink,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import {
  PartnerProgramReview,
  PartnerProgramSubmission,
} from '@/components/partner-program-controls';
import { buttonVariants } from '@/components/ui/button';
import {
  listPartnerPrograms,
  partnerProgramCategories,
} from '@/lib/forum/partner-programs';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

const statusLabels = {
  pending: 'На проверке',
  published: 'Проверено',
  paused: 'Приостановлено',
  rejected: 'Отклонено',
} as const;

const statusStyles = {
  pending: 'bg-amber-soft text-amber-ink',
  published: 'bg-emerald-soft text-emerald-ink',
  paused: 'bg-muted text-muted-foreground',
  rejected: 'bg-destructive/10 text-destructive',
} as const;

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const user = await requireCommunityUser();
  const params = await searchParams;
  const query = (params.q || '').trim();
  const category = params.category || '';
  const data = await listPartnerPrograms(user, { query, category });
  const canSubmit = user.role === 'partner' || user.role === 'admin';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active="partners"
      />
      <main className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">
              Белая монетизация и проверяемые условия
            </p>
            <h1 className="mt-2 font-heading text-4xl font-bold tracking-[-0.045em]">
              Партнёрские программы
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Каталог для IT-специалистов: только законные предложения с
              открытыми условиями, HTTPS-ссылками и обязательным раскрытием
              выгоды автора до перехода.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <article className="rounded-2xl border border-border bg-card p-4">
              <BadgeCheck className="size-4 text-emerald-ink" />
              <strong className="mt-3 block font-heading text-2xl">
                {data.stats.published}
              </strong>
              <span className="text-xs text-muted-foreground">проверено</span>
            </article>
            <article className="rounded-2xl border border-border bg-card p-4">
              <ClipboardCheck className="size-4 text-violet-ink" />
              <strong className="mt-3 block font-heading text-2xl">
                {data.stats.categories}
              </strong>
              <span className="text-xs text-muted-foreground">категорий</span>
            </article>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-amber-ink/15 bg-amber-soft p-5 text-amber-ink">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            <div>
              <h2 className="font-heading font-bold">Правило прозрачности</h2>
              <p className="mt-1 text-sm leading-6 opacity-80">
                Каждая кнопка перехода помечена как реферальная. Перед ней
                указано, кто и при каком событии получает вознаграждение.
                Публикация без этого раскрытия технически невозможна.
              </p>
            </div>
          </div>
        </section>

        {canSubmit && (
          <div className="mt-6">
            <PartnerProgramSubmission role={user.role} />
          </div>
        )}

        <form
          action="/partners"
          method="get"
          className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_280px_auto]"
        >
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Поиск по программам</span>
            <input
              name="q"
              defaultValue={query}
              minLength={2}
              maxLength={100}
              placeholder="Название, описание или вознаграждение"
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <label>
            <span className="sr-only">Категория</span>
            <select
              name="category"
              defaultValue={category}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
            >
              <option value="">Все категории</option>
              {Object.entries(partnerProgramCategories).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonVariants({ variant: 'outline' })}>
            Применить
          </button>
        </form>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          {data.programs.map((program) => (
            <article
              key={program.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {program.categoryLabel}
                  </span>
                  <h2 className="mt-1 font-heading text-xl font-bold tracking-[-0.02em]">
                    {program.name}
                  </h2>
                  <Link
                    href={program.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
                  >
                    {program.websiteHost} <ExternalLink className="size-3" />
                  </Link>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[program.status]}`}>
                  {statusLabels[program.status]}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {program.description}
              </p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-muted/55 p-3">
                  <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <CircleDollarSign className="size-3.5" /> Вознаграждение
                  </dt>
                  <dd className="mt-1.5 text-sm leading-5">{program.rewardSummary}</dd>
                </div>
                <div className="rounded-xl bg-muted/55 p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Условия выплат
                  </dt>
                  <dd className="mt-1.5 text-sm leading-5">{program.payoutTerms}</dd>
                </div>
              </dl>

              <div className="mt-4 rounded-xl border border-amber-ink/15 bg-amber-soft p-3 text-amber-ink">
                <strong className="text-[10px] uppercase tracking-[0.1em]">
                  Реклама · раскрытие выгоды
                </strong>
                <p className="mt-1 text-xs leading-5 opacity-85">
                  {program.commercialDisclosure}
                </p>
              </div>

              {program.moderationNote && program.status !== 'published' && (
                <p className="mt-3 text-xs text-destructive">
                  Комментарий проверки: {program.moderationNote}
                </p>
              )}

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                <p className="text-[11px] text-muted-foreground">
                  Добавил {program.submittedBy} · обновлено {program.updated}
                </p>
                {program.status === 'published' && (
                  <Link
                    href={program.referralUrl}
                    target="_blank"
                    rel="nofollow sponsored noopener noreferrer"
                    className={buttonVariants({ size: 'sm' })}
                  >
                    Реферальный переход <ArrowUpRight data-icon="inline-end" />
                  </Link>
                )}
              </div>

              {user.role === 'admin' && (
                <PartnerProgramReview id={program.id} status={program.status} />
              )}
            </article>
          ))}
        </section>

        {!data.programs.length && (
          <section className="mt-5 rounded-2xl border border-dashed border-border px-5 py-16 text-center">
            <CircleDollarSign className="mx-auto size-7 text-muted-foreground" />
            <h2 className="mt-4 font-heading text-xl font-bold">
              Программ пока нет
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {query || category
                ? 'По выбранным условиям ничего не найдено. Измените фильтры.'
                : canSubmit
                  ? 'Добавьте первую программу: условия и раскрытие выгоды будут проверены на сервере.'
                  : 'Опубликованные и проверенные предложения появятся здесь.'}
            </p>
            {(query || category) && (
              <Link href="/partners" className={buttonVariants({ variant: 'outline', className: 'mt-5' })}>
                Сбросить фильтры
              </Link>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
