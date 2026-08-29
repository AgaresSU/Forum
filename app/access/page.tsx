import { ArrowLeft, Check, KeyRound, Lock, Shield, Sparkles, UserRound } from 'lucide-react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const roles = [
  { name: 'Гость', note: 'Только стартовая', free: false, publish: false, pro: false, moderate: false, manage: false },
  { name: 'Участник', note: 'Базовый аккаунт', free: true, publish: true, pro: false, moderate: false, manage: false },
  { name: 'PRO', note: 'Платный доступ', free: true, publish: true, pro: true, moderate: false, manage: false },
  { name: 'Модератор', note: 'Команда форума', free: true, publish: true, pro: true, moderate: true, manage: false },
  { name: 'Администратор', note: 'Полный доступ', free: true, publish: true, pro: true, moderate: true, manage: true },
];

const permissions = [
  { key: 'free', label: 'Читать бесплатные разделы' },
  { key: 'publish', label: 'Публиковать темы и ответы' },
  { key: 'pro', label: 'Читать PRO-разделы' },
  { key: 'moderate', label: 'Модерировать контент' },
  { key: 'manage', label: 'Управлять ролями и интеграциями' },
] as const;

export default async function AccessPage() {
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
          <Link href="/integrations" className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold transition hover:border-primary/30">Интеграции</Link>
        </header>

        <section className="mb-7 max-w-3xl">
          <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-violet-soft text-violet-ink">
            <KeyRound className="size-5" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-strong">Контроль доступа</p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Роли — отдельно от оплаты</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Подписка открывает материалы, а роль определяет действия. Это не позволяет платёжному провайдеру напрямую управлять правами форума.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_-50px_rgb(20_39_32/60%)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/55 text-left">
                  <th className="px-5 py-4 font-semibold">Возможность</th>
                  {roles.map((role) => (
                    <th key={role.name} className="px-4 py-4 text-center">
                      <span className="block font-heading font-bold">{role.name}</span>
                      <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{role.note}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission.key} className="border-b border-border last:border-0">
                    <td className="px-5 py-4 font-medium">{permission.label}</td>
                    {roles.map((role) => (
                      <td key={role.name} className="px-4 py-4 text-center">
                        {role[permission.key] ? (
                          <span className="mx-auto grid size-6 place-items-center rounded-full bg-emerald-soft text-emerald-ink" aria-label="Доступно">
                            <Check className="size-3.5" />
                          </span>
                        ) : (
                          <span className="text-muted-foreground/45">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-4">
          {[
            { icon: UserRound, title: 'Базовые', text: 'Темы сообщества, доступные участникам после входа.', tone: 'bg-emerald-soft text-emerald-ink' },
            { icon: Shield, title: 'Для участников', text: 'Публикации, ответы и личные подписки.', tone: 'bg-amber-soft text-amber-ink' },
            { icon: Sparkles, title: 'PRO', text: 'Закрытые разборы, шаблоны и материалы.', tone: 'bg-violet-soft text-violet-ink' },
            { icon: Lock, title: 'Служебные', text: 'Модерация, аудит и настройки интеграций.', tone: 'bg-muted text-foreground' },
          ].map(({ icon: Icon, title, text, tone }) => (
            <article key={title} className="rounded-2xl border border-border bg-card p-5">
              <div className={`mb-4 grid size-9 place-items-center rounded-xl ${tone}`}><Icon className="size-4" /></div>
              <h2 className="font-heading font-bold">{title}</h2>
              <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
