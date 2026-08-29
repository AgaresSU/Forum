'use client';

import { useMemo, useState } from 'react';
import {
  AtSign,
  Bell,
  CheckCheck,
  MessageCircleReply,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

type NotificationItem = {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  href: string;
  actor: string | null;
  isRead: boolean;
  created: string;
};

function NotificationIcon({ type }: { type: string }) {
  if (type === 'mention') return <AtSign className="size-4" />;
  if (type === 'topic_reply') return <MessageCircleReply className="size-4" />;
  if (type.startsWith('moderation_') || type.startsWith('report_'))
    return <ShieldCheck className="size-4" />;
  return <Bell className="size-4" />;
}

export function NotificationCenter({
  initialItems,
}: {
  initialItems: NotificationItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<'all' | 'unread'>('all');
  const [pending, setPending] = useState(false);
  const visibleItems = useMemo(
    () => (view === 'unread' ? items.filter((item) => !item.isRead) : items),
    [items, view],
  );
  const unreadCount = items.filter((item) => !item.isRead).length;

  async function openNotification(item: NotificationItem) {
    if (!item.isRead) {
      await fetch(`/api/notifications/${item.id}/read`, { method: 'POST' });
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id ? { ...candidate, isRead: true } : candidate,
        ),
      );
    }
    window.location.assign(item.href);
  }

  async function markAllRead() {
    setPending(true);
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Не удалось отметить уведомления');
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex flex-col gap-3 border-b border-border bg-muted/45 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setView('all')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
          >
            Все · {items.length}
          </button>
          <button
            type="button"
            onClick={() => setView('unread')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === 'unread' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
          >
            Непрочитанные · {unreadCount}
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending || unreadCount === 0}
          onClick={markAllRead}
        >
          <CheckCheck data-icon="inline-start" />{' '}
          {pending ? 'Сохраняем…' : 'Прочитать все'}
        </Button>
      </header>
      {visibleItems.length ? (
        <ol>
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className="border-t border-border first:border-t-0"
            >
              <button
                type="button"
                onClick={() => openNotification(item)}
                className={`flex w-full gap-4 px-5 py-4 text-left transition hover:bg-muted/40 ${item.isRead ? '' : 'bg-emerald-soft/35'}`}
              >
                <span
                  className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${item.isRead ? 'bg-muted text-muted-foreground' : 'bg-emerald-soft text-emerald-ink'}`}
                >
                  <NotificationIcon type={item.notification_type} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <strong className="font-heading text-sm">
                      {item.title}
                    </strong>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {item.created}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    {item.body}
                  </span>
                  {item.actor && (
                    <span className="mt-2 block text-[11px] font-semibold text-muted-foreground">
                      От: {item.actor}
                    </span>
                  )}
                </span>
                {!item.isRead && (
                  <span
                    className="mt-2 size-2 shrink-0 rounded-full bg-accent-strong"
                    aria-label="Не прочитано"
                  />
                )}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="px-5 py-16 text-center">
          <Bell className="mx-auto size-7 text-muted-foreground" />
          <h2 className="mt-4 font-heading font-bold">
            {view === 'unread' ? 'Всё прочитано' : 'Уведомлений пока нет'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ответы, упоминания и решения модераторов появятся здесь.
          </p>
        </div>
      )}
    </section>
  );
}
