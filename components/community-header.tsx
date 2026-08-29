import Link from 'next/link';
import {
  Bell,
  Code2,
  FilePenLine,
  Search,
  ShieldCheck,
  UserCog,
} from 'lucide-react';

import { getUnreadNotificationCount } from '@/lib/forum/notifications';

const navigation = [
  { href: '/forum', label: 'Форум', key: 'forum' },
  { href: '/journal', label: 'Журнал', key: 'journal' },
  { href: '/library', label: 'База знаний', key: 'library' },
  { href: '/groups', label: 'Группы', key: 'groups' },
  {
    href: '/editor',
    label: 'Редактор',
    key: 'editor',
    editorial: true,
  },
  {
    href: '/moderation',
    label: 'Модерация',
    key: 'moderation',
    moderation: true,
  },
  {
    href: '/admin/users',
    label: 'Админ',
    key: 'admin',
    admin: true,
  },
] as const;

export async function CommunityHeader({
  username,
  userId,
  role = 'member',
  active,
}: {
  username: string;
  userId?: string;
  role?: string;
  active: (typeof navigation)[number]['key'] | 'search';
}) {
  const unreadCount = userId ? await getUnreadNotificationCount(userId) : 0;
  const visibleNavigation = navigation.filter((item) => {
    if ('moderation' in item) return role === 'moderator' || role === 'admin';
    if ('editorial' in item)
      return ['author', 'expert', 'moderator', 'admin'].includes(role);
    if ('admin' in item) return role === 'admin';
    return true;
  });

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
              {'editorial' in item && (
                <FilePenLine className="mr-1 inline size-3.5" />
              )}
              {'admin' in item && <UserCog className="mr-1 inline size-3.5" />}
              {item.label}
            </Link>
          ))}
        </nav>

        <form
          action="/search"
          className="relative ml-auto hidden w-full max-w-[300px] md:block"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="community-search" className="sr-only">
            Поиск по сообществу
          </label>
          <input
            id="community-search"
            name="q"
            minLength={2}
            maxLength={100}
            placeholder="Поиск по сообществу"
            className="h-9 w-full rounded-xl border border-border bg-muted/55 pl-9 pr-3 text-sm outline-none transition focus:border-primary/30 focus:bg-card"
          />
        </form>
        <Link
          href="/search"
          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Поиск по сообществу"
        >
          <Search className="size-4" />
        </Link>
        <Link
          href="/notifications"
          className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Уведомления"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 grid min-w-4 place-items-center rounded-full bg-accent-strong px-1 text-[9px] font-bold leading-4 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
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
