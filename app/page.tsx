import Link from 'next/link';
import {
  ArrowRight,
  Braces,
  BriefcaseBusiness,
  Check,
  Code2,
  Database,
  Layers3,
  LockKeyhole,
  Network,
  ServerCog,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  Users,
} from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';

const directions = [
  { icon: ServerCog, title: 'Backend', text: 'Архитектура, API, производительность и эксплуатация сервисов.' },
  { icon: Code2, title: 'Frontend', text: 'Интерфейсы, доступность, браузерная платформа и инженерные практики.' },
  { icon: Smartphone, title: 'Mobile', text: 'Нативная и кроссплатформенная разработка мобильных продуктов.' },
  { icon: Network, title: 'DevOps & SRE', text: 'Инфраструктура, CI/CD, наблюдаемость и надёжность систем.' },
  { icon: Database, title: 'Data & ML', text: 'Хранилища, аналитические платформы и прикладное машинное обучение.' },
  { icon: ShieldCheck, title: 'Security', text: 'Безопасная разработка, аудит, защита приложений и инфраструктуры.' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/90 bg-background/95">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Основа — главная">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Braces className="size-[18px]" />
            </span>
            <span>
              <strong className="block font-heading text-[17px] leading-none tracking-[-0.02em]">Основа</strong>
              <span className="mt-1 block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">IT-сообщество</span>
            </span>
          </Link>

          <nav aria-label="Навигация по странице" className="ml-auto hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex">
            <a href="#about" className="transition hover:text-foreground">О сообществе</a>
            <a href="#directions" className="transition hover:text-foreground">Направления</a>
            <a href="#principles" className="transition hover:text-foreground">Принципы</a>
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-5">
            <span className="hidden sm:contents">
              <Link href="/auth?mode=login" className={buttonVariants({ variant: 'ghost' })}>Войти</Link>
            </span>
            <Link href="/auth" className={buttonVariants({ className: 'h-9 px-4' })}>Создать аккаунт</Link>
          </div>
        </div>
      </header>

      <section id="about" className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)] lg:items-center lg:px-8 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 border border-border bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent-strong" /> Закрытая профессиональная среда
            </div>
            <h1 className="max-w-3xl font-heading text-[clamp(2.75rem,6vw,5.2rem)] font-bold leading-[0.98] tracking-[-0.055em]">
              Для тех, кто создаёт <span className="text-primary">IT-продукты</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Профессиональный форум разработчиков, инженеров и технических специалистов. Обсуждаем архитектуру, инструменты, карьеру и практику создания надёжных систем.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth" className={buttonVariants({ size: 'lg', className: 'h-12 px-5 text-base' })}>
                Присоединиться <ArrowRight data-icon="inline-end" />
              </Link>
              <Link href="/auth?mode=login" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-12 px-5 text-base' })}>
                Войти в аккаунт
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {['Темы доступны после входа', 'Подтверждение почты', 'Защита 2FA'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2"><Check className="size-4 text-emerald-ink" /> {item}</span>
              ))}
            </div>
          </div>

          <div aria-label="Принципы технического сообщества" className="border border-border bg-card p-3 shadow-[0_32px_80px_-58px_rgb(20_39_32/75%)] sm:p-5">
            <div className="flex items-center gap-2 border-b border-border px-3 pb-4 pt-1 text-xs font-semibold text-muted-foreground">
              <span className="size-2 rounded-full bg-red-400/80" />
              <span className="size-2 rounded-full bg-amber-400/80" />
              <span className="size-2 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono">community.config.ts</span>
            </div>
            <pre className="overflow-x-auto px-3 py-7 font-mono text-[13px] leading-7 sm:text-sm"><code>
              <span className="text-violet-ink">export const</span> community = {'{'}{`\n`}
              {'  '}audience: [<span className="text-emerald-ink">&apos;developers&apos;</span>, <span className="text-emerald-ink">&apos;engineers&apos;</span>],{`\n`}
              {'  '}discussion: {'{'}{`\n`}
              {'    '}evidenceFirst: <span className="font-bold text-amber-ink">true</span>,{`\n`}
              {'    '}professionalTone: <span className="font-bold text-amber-ink">true</span>,{`\n`}
              {'    '}publicFeed: <span className="font-bold text-amber-ink">false</span>,{`\n`}
              {'  '}{'}'},{`\n`}
              {'  '}access: <span className="text-emerald-ink">&apos;verified-members&apos;</span>,{`\n`}
              {'}'} <span className="text-muted-foreground">as const;</span>
            </code></pre>
            <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
              {[
                ['Signal', 'Практический опыт'],
                ['Context', 'Аргументы и детали'],
                ['Respect', 'Без токсичности'],
              ].map(([label, value]) => (
                <div key={label} className="bg-background p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{label}</p>
                  <p className="mt-1 font-heading text-sm font-bold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="directions" className="border-b border-border bg-card/45">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-7 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-strong">Основные направления</p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Технические вопросы без поверхностных ответов</h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground lg:justify-self-end">
              Форум объединяет специалистов разных стеков. Ценность обсуждения — в воспроизводимых решениях, честных ограничениях и опыте эксплуатации.
            </p>
          </div>

          <div className="mt-10 grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-3">
            {directions.map(({ icon: Icon, title, text }) => (
              <article key={title} className="group min-h-48 border-b border-r border-border bg-background p-6 transition hover:bg-card sm:p-7">
                <Icon className="size-5 text-primary transition group-hover:translate-x-0.5" />
                <h3 className="mt-7 font-heading text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="principles">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-strong">Формат сообщества</p>
            <h2 className="mt-3 max-w-md font-heading text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Спокойное пространство для профессионального диалога</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: LockKeyhole, title: 'Закрытая лента', text: 'Содержимое тем не показывается незарегистрированным посетителям и поисковым системам.' },
              { icon: Users, title: 'Проверенные участники', text: 'Публикации доступны только аккаунтам с подтверждённой почтой.' },
              { icon: Layers3, title: 'Разделы по уровню доступа', text: 'Открытые для участников и дополнительные профессиональные материалы.' },
              { icon: BriefcaseBusiness, title: 'Практический фокус', text: 'Производственные задачи, процессы команд, карьера и технические решения.' },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="border-l-2 border-primary/30 py-2 pl-5">
                <Icon className="size-5 text-primary" />
                <h3 className="mt-4 font-heading font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground/55">Доступ к сообществу</p>
            <h2 className="mt-2 font-heading text-2xl font-bold tracking-[-0.03em] sm:text-3xl">Создайте профиль и войдите в обсуждение</h2>
          </div>
          <Link href="/auth" className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'h-11 shrink-0 px-5' })}>Зарегистрироваться <ArrowRight /></Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 font-heading font-bold text-foreground"><TerminalSquare className="size-4" /> Основа</div>
        <p>Профессиональное IT-сообщество · локальная версия</p>
      </footer>
    </main>
  );
}
