import Link from 'next/link';
import { ShieldCheck, UsersRound } from 'lucide-react';

import { cn } from '@/lib/utils';

const items = [
  { href: '/admin/users', label: 'Пользователи и роли', key: 'users', icon: UsersRound },
  { href: '/admin/reputation', label: 'Аудит репутации', key: 'reputation', icon: ShieldCheck },
] as const;

export function AdminNavigation({
  active,
}: {
  active: (typeof items)[number]['key'];
}) {
  return (
    <nav className="mt-5 flex flex-wrap gap-2" aria-label="Разделы администратора">
      {items.map(({ icon: Icon, ...item }) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition',
            active === item.key
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-3.5" /> {item.label}
        </Link>
      ))}
    </nav>
  );
}
