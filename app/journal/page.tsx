import Link from 'next/link';
import { ArrowRight, BookOpen, Clock3, Code2, Lock, Newspaper, ShieldCheck, TrendingUp } from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import { buttonVariants } from '@/components/ui/button';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

const articles = [
  { category: 'Разработка', title: 'Почему модульный монолит снова стал практичным выбором', summary: 'Границы модулей, независимость команд и момент, когда всё-таки пора выделять сервис.', author: 'Марина Волкова', time: '12 минут', topic: 'go-connection-leak', pro: false },
  { category: 'Карьера', title: 'Как техническому специалисту упаковать экспертную услугу', summary: 'От проблемы клиента и границ результата до прозрачной оценки и договора.', author: 'Алексей Р.', time: '9 минут', topic: 'project-estimation', pro: false },
  { category: 'DevOps', title: 'Наблюдаемость без отдельной platform-команды', summary: 'Минимальный набор метрик, логов и трассировки для растущего продукта.', author: 'Илья С.', time: '15 минут', topic: 'observability-stack', pro: true },
  { category: 'Продукты', title: 'Экономика первого B2B-микросервиса', summary: 'Какие расходы забывают учитывать и почему первые продажи не равны прибыли.', author: 'Дмитрий Л.', time: '11 минут', topic: 'first-b2b-microservice', pro: true },
  { category: 'Продвижение', title: 'Технический контент как канал органического роста', summary: 'Как соединить документацию, статьи и обсуждения без поискового спама.', author: 'Никита В.', time: '8 минут', topic: 'seo-audit-2026', pro: false },
  { category: 'Безопасность', title: 'Code review как часть защитного контура', summary: 'Чек-лист, модель угроз и границы автоматических проверок.', author: 'Анна М.', time: '14 минут', topic: 'secure-code-review', pro: true },
];

export default async function JournalPage() {
  const user = await requireCommunityUser();
  const [featured, ...rest] = articles;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader username={user.username} active="journal" />
      <main className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="mb-7 max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">Редакция и авторы сообщества</p>
          <h1 className="mt-2 font-heading text-4xl font-bold tracking-[-0.045em]">Журнал «Основы»</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">Практические статьи связываются с форумными обсуждениями: материал сохраняет структуру и версии, а опыт участников — живой контекст.</p>
        </header>

        <section className="grid overflow-hidden rounded-2xl border border-border bg-primary text-primary-foreground lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="p-6 sm:p-8 lg:p-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"><TrendingUp className="size-3" /> Выбор редакции</span>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.13em] text-primary-foreground/55">{featured.category}</p>
            <h2 className="mt-3 max-w-3xl font-heading text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl">{featured.title}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-primary-foreground/70">{featured.summary}</p>
            <div className="mt-7 flex flex-wrap items-center gap-4 text-xs text-primary-foreground/60"><span>{featured.author}</span><span className="inline-flex items-center gap-1"><Clock3 className="size-3" /> {featured.time}</span></div>
            <Link href={`/forum/topic/${featured.topic}`} className={buttonVariants({ variant: 'secondary', className: 'mt-7' })}>Читать и обсуждать <ArrowRight data-icon="inline-end" /></Link>
          </div>
          <div className="grid min-h-[260px] place-items-center border-t border-primary-foreground/10 bg-[radial-gradient(circle_at_center,var(--primary-foreground)_1px,transparent_1.5px)] [background-size:22px_22px] lg:border-l lg:border-t-0">
            <div className="grid size-24 place-items-center rounded-3xl border border-primary-foreground/20 bg-primary-foreground/10"><Code2 className="size-10" /></div>
          </div>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]">
          <section className="grid gap-4 md:grid-cols-2">
            {rest.map((article) => (
              <article key={article.title} className="flex flex-col rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-accent-strong">{article.category}</span>
                  {article.pro && <span className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-2 py-1 text-[9px] font-bold text-violet-ink"><Lock className="size-2.5" /> PRO</span>}
                </div>
                <h2 className="mt-4 font-heading text-xl font-bold leading-7 tracking-[-0.025em]">{article.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{article.summary}</p>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground"><span>{article.author}</span><span>{article.time}</span></div>
                <Link href={`/forum/topic/${article.topic}`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">Открыть материал <ArrowRight className="size-3.5" /></Link>
              </article>
            ))}
          </section>
          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2"><Newspaper className="size-4 text-emerald-ink" /><h2 className="font-heading text-sm font-bold">Рубрики</h2></div>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">{['Разработка', 'Инфраструктура', 'Продукты и работа', 'Продвижение', 'Безопасность'].map((item) => <li key={item}><span className="transition hover:text-foreground">{item}</span></li>)}</ul>
            </section>
            <section className="rounded-2xl border border-emerald-ink/15 bg-emerald-soft p-5 text-emerald-ink">
              <div className="flex items-center gap-2"><BookOpen className="size-4" /><h2 className="font-heading text-sm font-bold">Статья → обсуждение</h2></div>
              <p className="mt-2 text-xs leading-5 opacity-80">У каждого большого материала может быть связанная тема. Комментарии не теряются после обновления статьи.</p>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-violet-ink" /><h2 className="font-heading text-sm font-bold">Редакционная проверка</h2></div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Коммерческие материалы маркируются, а кейсы о доходе проходят проверку условий и рисков.</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
