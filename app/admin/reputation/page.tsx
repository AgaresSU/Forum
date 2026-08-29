import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  ShieldAlert,
  UserRoundCheck,
} from 'lucide-react';

import { AdminNavigation } from '@/components/admin/admin-navigation';
import { CommunityHeader } from '@/components/community-header';
import { buttonVariants } from '@/components/ui/button';
import { requireCommunityUser } from '@/lib/forum/require-community-user';
import { listReputationAudit } from '@/lib/forum/reputation-audit';

export const dynamic = 'force-dynamic';

const actionLabels = {
  added: 'Начисление',
  replaced: 'Замена',
  removed: 'Снятие',
} as const;

const reactionLabels: Record<string, string> = {
  helpful: 'Полезно',
  insightful: 'Содержательно',
  thanks: 'Спасибо',
};

const riskLabels = {
  burst: 'Высокая частота',
  pair: 'Повтор одной паре',
  churn: 'Частые переключения',
} as const;

export default async function ReputationAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; risk?: string }>;
}) {
  const user = await requireCommunityUser();
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <CommunityHeader username={user.username} userId={user.id} role={user.role} active="admin" />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-5 font-heading text-3xl font-bold">Аудит репутации</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Журнал репутационных действий доступен только администраторам.
          </p>
          <Link href="/forum" className={buttonVariants({ className: 'mt-6' })}>
            Вернуться на форум
          </Link>
        </main>
      </div>
    );
  }

  const params = await searchParams;
  const filters = {
    query: (params.q || '').trim(),
    action: params.action || 'all',
    risk: params.risk || 'all',
  };
  const data = await listReputationAudit(user, filters);
  if (!data) throw new Error('Reputation audit is unavailable');

  const stats = [
    { label: 'Событий за 24 часа', value: data.stats.lastDay, icon: Activity },
    { label: 'Дельта за 24 часа', value: `${data.stats.netScore > 0 ? '+' : ''}${data.stats.netScore}`, icon: ArrowRightLeft },
    { label: 'Сигналов риска', value: data.stats.flagged, icon: AlertTriangle },
    { label: 'Активных участников', value: data.stats.actors, icon: UserRoundCheck },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader username={user.username} userId={user.id} role={user.role} active="admin" />
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">
            Append-only журнал
          </p>
          <h1 className="mt-2 font-heading text-4xl font-bold tracking-[-0.045em]">
            Аудит репутации
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Каждое начисление, переключение и снятие реакции записывается вместе
            с точной дельтой. Сигналы помогают начать проверку, но сами по себе
            не считаются доказательством злоупотребления.
          </p>
          <AdminNavigation active="reputation" />
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ icon: Icon, ...stat }) => (
            <article key={stat.label} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="size-4 text-violet-ink" />
              <strong className="mt-3 block font-heading text-2xl tabular-nums">{stat.value}</strong>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </article>
          ))}
        </section>

        <form action="/admin/reputation" method="get" className="mt-5 grid gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_220px_240px_auto]">
          <label>
            <span className="sr-only">Поиск по журналу</span>
            <input
              name="q"
              defaultValue={filters.query}
              placeholder="Участник или ID материала"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <label>
            <span className="sr-only">Действие</span>
            <select name="action" defaultValue={filters.action} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none">
              <option value="all">Все действия</option>
              <option value="added">Начисления</option>
              <option value="replaced">Замены</option>
              <option value="removed">Снятия</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Сигнал риска</span>
            <select name="risk" defaultValue={filters.risk} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none">
              <option value="all">Все уровни риска</option>
              <option value="flagged">Любой сигнал</option>
              <option value="burst">Высокая частота</option>
              <option value="pair">Повтор одной паре</option>
              <option value="churn">Частые переключения</option>
            </select>
          </label>
          <button type="submit" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Применить</button>
        </form>

        <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
          <header className="flex items-center justify-between gap-3 border-b border-border bg-muted/45 px-5 py-4">
            <h2 className="font-heading font-bold">Последние события</h2>
            <span className="text-xs text-muted-foreground">
              {data.events.length} из {data.scanned}
            </span>
          </header>
          {data.events.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-border text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Время и действие</th>
                    <th className="px-4 py-3">От кого → кому</th>
                    <th className="px-4 py-3">Цель</th>
                    <th className="px-4 py-3">Изменение</th>
                    <th className="px-5 py-3">Сигналы</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-5 py-4">
                        <strong className="block text-xs">{actionLabels[event.action]}</strong>
                        <span className="mt-1 block text-[11px] text-muted-foreground">{event.created}</span>
                      </td>
                      <td className="px-4 py-4">
                        <strong>{event.actor_username}</strong>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        <strong>{event.recipient_username}</strong>
                      </td>
                      <td className="px-4 py-4">
                        <span className="block text-xs font-semibold">{event.target_type}</span>
                        <code className="mt-1 block max-w-[260px] truncate text-[10px] text-muted-foreground" title={event.target_id}>{event.target_id}</code>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`font-heading text-base font-bold ${event.score_delta > 0 ? 'text-emerald-ink' : event.score_delta < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {event.score_delta > 0 ? '+' : ''}{event.score_delta}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {event.previous_reaction_type ? reactionLabels[event.previous_reaction_type] : '—'} → {event.reaction_type ? reactionLabels[event.reaction_type] : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {event.flags.length ? (
                          <div className="flex flex-wrap gap-1">
                            {event.flags.map((flag) => (
                              <span key={flag} className="rounded-full bg-amber-soft px-2 py-1 text-[9px] font-bold text-amber-ink">{riskLabels[flag]}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Нет сигналов</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-14 text-center text-sm text-muted-foreground">
              События по выбранным фильтрам не найдены.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
