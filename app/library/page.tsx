import Link from 'next/link';
import { ArrowRight, BookMarked, CheckCircle2, FileText, GitBranch, Lock, Search, ShieldCheck } from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

const manuals = [
  { title: 'Стандарт качественного мануала', category: 'Работа с базой знаний', version: '2.1', updated: 'вчера', discussion: 'manual-quality-standard', pro: false },
  { title: 'Диагностика утечки соединений в Go', category: 'Backend', version: '1.4', updated: 'сегодня', discussion: 'go-connection-leak', pro: false },
  { title: 'Технический SEO-аудит продукта', category: 'Продвижение', version: '3.0', updated: '2 дня назад', discussion: 'seo-audit-2026', pro: false },
  { title: 'Проверка партнёрской программы', category: 'Заработок', version: '1.2', updated: 'сегодня', discussion: 'affiliate-checklist', pro: true },
  { title: 'Code review защищённого сервиса', category: 'Безопасность', version: '2.0', updated: '4 дня назад', discussion: 'secure-code-review', pro: true },
  { title: 'Выбор observability-стека', category: 'DevOps & SRE', version: '1.8', updated: 'неделю назад', discussion: 'observability-stack', pro: true },
];

export default async function LibraryPage() {
  const user = await requireCommunityUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader username={user.username} userId={user.id} role={user.role} active="library" />
      <main className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">Версионные материалы сообщества</p>
            <h1 className="mt-2 font-heading text-4xl font-bold tracking-[-0.045em]">База знаний</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">Мануалы живут отдельно от форумной переписки, получают версии и сохраняют связанную тему для вопросов и обновлений.</p>
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Поиск по базе знаний</span>
            <input placeholder="Найти инструкцию или инструмент" className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/10" />
          </label>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Разработка', '84 материала'],
            ['Работа и продукты', '57 материалов'],
            ['Продвижение', '42 материала'],
            ['Инструменты', '96 материалов'],
          ].map(([title, count]) => (
            <article key={title} className="rounded-2xl border border-border bg-card p-4"><BookMarked className="size-4 text-emerald-ink" /><h2 className="mt-4 font-heading font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{count}</p></article>
          ))}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <header className="border-b border-border bg-muted/45 px-5 py-4"><h2 className="font-heading font-bold">Недавно обновлённые</h2></header>
            {manuals.map((manual) => (
              <article key={manual.title} className="flex flex-col gap-4 border-t border-border px-5 py-4 first:border-t-0 sm:flex-row sm:items-center">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-soft text-emerald-ink"><FileText className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-heading font-bold">{manual.title}</h3>{manual.pro && <span className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-2 py-0.5 text-[9px] font-bold text-violet-ink"><Lock className="size-2.5" /> PRO</span>}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{manual.category} · версия {manual.version} · обновлено {manual.updated}</p>
                </div>
                <Link href={`/forum/topic/${manual.discussion}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary">Материал и обсуждение <ArrowRight className="size-3" /></Link>
              </article>
            ))}
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2"><GitBranch className="size-4 text-violet-ink" /><h2 className="font-heading text-sm font-bold">Версии и изменения</h2></div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Каждое существенное обновление создаёт ревизию и журнал изменений. Старую версию можно восстановить.</p>
            </section>
            <section className="rounded-2xl border border-emerald-ink/15 bg-emerald-soft p-5 text-emerald-ink">
              <div className="flex items-center gap-2"><CheckCircle2 className="size-4" /><h2 className="font-heading text-sm font-bold">Редакционный стандарт</h2></div>
              <p className="mt-2 text-xs leading-5 opacity-80">Условия, версии, безопасный откат, проверяемый результат и связанная тема обязательны для публикации.</p>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-amber-ink" /><h2 className="font-heading text-sm font-bold">Проверка безопасности</h2></div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Команды, меняющие данные или конфигурацию, должны явно указывать область действия и резервное копирование.</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
