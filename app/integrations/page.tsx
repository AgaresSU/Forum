import { ArrowLeft, ArrowRight, CircleDot, Database, Plug, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSessionUser } from '@/lib/auth/session';
import { integrationRegistry } from '@/lib/integrations/registry';

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  const requestHeaders = await headers();
  const user = await getSessionUser(requestHeaders.get('cookie'));
  if (!user) redirect('/auth?mode=login');

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/forum" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="size-4" /> Вернуться к форуму
          </Link>
          <Link href="/access" className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold transition hover:border-primary/30">Роли и доступы</Link>
        </header>

        <section className="mb-8 max-w-3xl">
          <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-emerald-soft text-emerald-ink">
            <Plug className="size-5" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-strong">Контур интеграций</p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Внешние сервисы не смешаны с форумом</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Каждый внешний сервис подключается через отдельный шлюз. Сейчас используются только локальные заглушки: сеть, платежи и реальные аккаунты не задействованы.
          </p>
        </section>

        <section aria-label="Схема связности" className="mb-7 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:p-6">
          <div className="rounded-xl bg-primary p-4 text-primary-foreground">
            <p className="text-xs font-bold uppercase tracking-wider text-primary-foreground/60">Интерфейс</p>
            <p className="mt-1 font-heading font-bold">Темы · роли · PRO</p>
          </div>
          <ArrowRight className="mx-auto hidden size-4 text-muted-foreground sm:block" />
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ядро</p>
            <p className="mt-1 font-heading font-bold">Правила доступа</p>
          </div>
          <ArrowRight className="mx-auto hidden size-4 text-muted-foreground sm:block" />
          <div className="rounded-xl bg-violet-soft p-4 text-violet-ink">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">Шлюзы</p>
            <p className="mt-1 font-heading font-bold">Заменяемые адаптеры</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {integrationRegistry.map((integration) => (
            <article key={integration.key} className="rounded-2xl border border-border bg-card p-5 shadow-[0_16px_50px_-44px_rgb(20_39_32/55%)]">
              <div className="flex items-start gap-4">
                <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${integration.status === 'local' ? 'bg-emerald-soft text-emerald-ink' : 'bg-muted text-muted-foreground'}`}>
                  {integration.status === 'local' ? <Database className="size-4" /> : <CircleDot className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-heading font-bold">{integration.name}</h2>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${integration.status === 'local' ? 'bg-emerald-soft text-emerald-ink' : 'bg-muted text-muted-foreground'}`}>
                      {integration.status === 'local' ? 'Локальная заглушка' : 'Запланировано'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">{integration.purpose}</p>
                  <dl className="mt-4 grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 border-t border-border pt-4 text-xs">
                    <dt className="text-muted-foreground">Потребитель</dt>
                    <dd className="font-medium">{integration.consumer}</dd>
                    <dt className="text-muted-foreground">Контракт</dt>
                    <dd className="font-mono text-[11px] font-semibold text-violet-ink">{integration.boundary}</dd>
                  </dl>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-7 flex gap-4 rounded-2xl border border-amber-ink/15 bg-amber-soft p-5 text-amber-ink">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="font-heading font-bold">Правило подключения</h2>
            <p className="mt-1 text-sm leading-5 opacity-80">Ключи хранятся только в локальном окружении; публикации форума никогда не содержат секреты провайдеров.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
