import { BriefcaseBusiness, ChevronRight, Code2, Database, Lock, ServerCog, ShieldCheck, UsersRound } from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import { buttonVariants } from '@/components/ui/button';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

const groups = [
  { name: 'Backend Architecture', description: 'Проектирование сервисов, API и работа с техническим долгом.', icon: Code2, visibility: 'Открытая', members: 284, activity: '12 новых сообщений', tone: 'bg-emerald-soft text-emerald-ink' },
  { name: 'DevOps & SRE', description: 'Эксплуатация, платформенные команды, наблюдаемость и инциденты.', icon: ServerCog, visibility: 'Открытая', members: 196, activity: '8 новых сообщений', tone: 'bg-amber-soft text-amber-ink' },
  { name: 'Data & AI Practitioners', description: 'Хранилища, аналитические платформы и прикладные ML-системы.', icon: Database, visibility: 'По заявке', members: 143, activity: '5 новых сообщений', tone: 'bg-violet-soft text-violet-ink' },
  { name: 'Создатели цифровых продуктов', description: 'Закрытый клуб авторов SaaS, сервисов и образовательных продуктов.', icon: BriefcaseBusiness, visibility: 'PRO · по заявке', members: 87, activity: '16 новых сообщений', tone: 'bg-primary text-primary-foreground' },
];

export default async function GroupsPage() {
  const user = await requireCommunityUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader username={user.username} role={user.role} active="groups" />
      <main className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">Микросообщества внутри платформы</p>
            <h1 className="mt-2 font-heading text-4xl font-bold tracking-[-0.045em]">Группы и клубы</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">Группа определяет членство и рабочий круг, роль — права на платформе. Пользователь может состоять в нескольких сообществах с разным уровнем доступа.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Ваши членства</p>
            <div className="mt-3 flex items-center justify-between"><span className="text-sm font-semibold">Пока нет активных групп</span><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">0</span></div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {groups.map(({ icon: Icon, ...group }) => (
            <article key={group.name} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-4">
                <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${group.tone}`}><Icon className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-heading text-lg font-bold tracking-[-0.02em]">{group.name}</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[9px] font-bold uppercase text-muted-foreground">{group.visibility.includes('PRO') && <Lock className="size-2.5" />}{group.visibility}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{group.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><UsersRound className="size-3.5" /> {group.members} участников</span><span>{group.activity}</span></div>
                </div>
              </div>
              <div className="mt-5 flex justify-end border-t border-border pt-4"><button type="button" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Подробнее <ChevronRight data-icon="inline-end" /></button></div>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-emerald-ink/15 bg-emerald-soft p-5 text-emerald-ink"><UsersRound className="size-5" /><h2 className="mt-4 font-heading font-bold">Членство отдельно от роли</h2><p className="mt-2 text-sm leading-6 opacity-80">Эксперт может быть обычным участником клуба, а руководитель группы не получает глобальных прав модератора.</p></article>
          <article className="rounded-2xl border border-violet-ink/15 bg-violet-soft p-5 text-violet-ink"><Lock className="size-5" /><h2 className="mt-4 font-heading font-bold">Открытые и закрытые контуры</h2><p className="mt-2 text-sm leading-6 opacity-80">Группы бывают открытыми, по заявке, по приглашению или полностью скрытыми.</p></article>
          <article className="rounded-2xl border border-border bg-card p-5"><ShieldCheck className="size-5 text-amber-ink" /><h2 className="mt-4 font-heading font-bold">Единая модерация</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Правила легального контента действуют и внутри закрытых групп. Руководители отвечают только за свой контур.</p></article>
        </section>
      </main>
    </div>
  );
}
