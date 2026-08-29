import Link from 'next/link';
import { Bell, Code2, Search, ShieldCheck } from 'lucide-react';

const navigation = [
  { href: '/forum', label: 'Форум', key: 'forum' },
  { href: '/journal', label: 'Журнал', key: 'journal' },
  { href: '/library', label: 'База знаний', key: 'library' },
  { href: '/groups', label: 'Группы', key: 'groups' },
  {
    href: '/moderation',
    label: 'Модерация',
    key: 'moderation',
    moderation: true,
  },
] as const;

export function CommunityHeader({
  username,
  role = 'member',
  active,
}: {
  username: string;
  role?: string;
  active: (typeof navigation)[number]['key'];
}) {
  const visibleNavigation = navigation.filter(
    (item) =>
      !('moderation' in item) || role === 'moderator' || role === 'admin',
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/forum"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="Основа — сообщество"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Code2 className="size-[18px]" />
          </span>
          <span className="leading-none">
            <strong className="block font-heading text-[17px] tracking-[-0.02em]">
              Основа
            </strong>
            <span className="mt-1 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              IT-сообщество
            </span>
          </span>
        </Link>

        <nav
          className="ml-5 hidden items-center gap-1 lg:flex"
          aria-label="Основные разделы"
        >
          {visibleNavigation.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active === item.key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {'moderation' in item && (
                <ShieldCheck className="mr-1 inline size-3.5" />
              )}
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/forum"
          className="ml-auto hidden h-9 w-full max-w-[300px] items-center gap-2 rounded-xl border border-border bg-muted/55 px-3 text-sm text-muted-foreground transition hover:border-primary/30 hover:bg-card md:flex"
        >
          <Search className="size-4" /> Поиск по сообществу
        </Link>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Уведомления"
        >
          <Bell className="size-4" />
        </button>
        <Link
          href="/account/security"
          aria-label="Личный кабинет"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-soft text-xs font-bold uppercase text-amber-ink transition hover:ring-4 hover:ring-amber-soft/70"
        >
          {username.slice(0, 2).toUpperCase()}
        </Link>
      </div>
      <div className="border-t border-border/70 lg:hidden">
        <nav
          className="mx-auto flex max-w-[1480px] gap-1 overflow-x-auto px-4 py-2 sm:px-6"
          aria-label="Мобильные разделы"
        >
          {visibleNavigation.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${active === item.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
