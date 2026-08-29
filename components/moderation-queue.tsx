'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, ShieldAlert, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

type PendingTopic = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  is_commercial: number;
  commercial_disclosure: string | null;
  forum_title: string;
  author: string;
  created: string;
};

type OpenReport = {
  id: string;
  target_type: string;
  target_id: string;
  target_slug: string | null;
  target_title: string | null;
  reason: string;
  details: string;
  reporter: string;
  created: string;
};

const reasonLabels: Record<string, string> = {
  illegal: 'Незаконный контент',
  fraud: 'Мошенничество',
  spam: 'Спам или реклама',
  harassment: 'Оскорбления',
  personal_data: 'Персональные данные',
  other: 'Другое',
};

export function ModerationQueue({
  initialTopics,
  initialReports,
}: {
  initialTopics: PendingTopic[];
  initialReports: OpenReport[];
}) {
  const [topics, setTopics] = useState(initialTopics);
  const [reports, setReports] = useState(initialReports);
  const [pendingId, setPendingId] = useState('');
  const [message, setMessage] = useState('');

  async function act(path: string, action: string, afterSuccess: () => void) {
    setPendingId(path);
    setMessage('');
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok)
        throw new Error(result.message || 'Не удалось выполнить действие');
      afterSuccess();
      setMessage('Решение сохранено в локальной базе');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Не удалось выполнить действие',
      );
    } finally {
      setPendingId('');
    }
  }

  return (
    <div className="space-y-6">
      <p className="min-h-5 text-xs text-muted-foreground" aria-live="polite">
        {message}
      </p>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-muted/45 px-5 py-4">
          <div>
            <h2 className="font-heading font-bold">Темы на премодерации</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Заработок, реклама и другие разделы с обязательной проверкой.
            </p>
          </div>
          <span className="rounded-full bg-violet-soft px-2.5 py-1 text-xs font-bold text-violet-ink">
            {topics.length}
          </span>
        </header>
        {topics.length ? (
          topics.map((topic) => {
            const path = `/api/moderation/topics/${topic.id}`;
            return (
              <article
                key={topic.id}
                className="border-t border-border p-5 first:border-t-0"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent-strong">
                        {topic.forum_title}
                      </span>
                      {Boolean(topic.is_commercial) && (
                        <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[9px] font-bold uppercase text-amber-ink">
                          Коммерческий
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-heading text-lg font-bold">
                      {topic.title}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {topic.excerpt}
                    </p>
                    {topic.commercial_disclosure && (
                      <p className="mt-3 rounded-xl bg-amber-soft p-3 text-xs leading-5 text-amber-ink">
                        <strong>Раскрытие:</strong>{' '}
                        {topic.commercial_disclosure}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      {topic.author} · {topic.created}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/forum/topic/${topic.slug}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
                    >
                      <ExternalLink className="size-3.5" /> Открыть
                    </Link>
                    <Button
                      disabled={pendingId === path}
                      variant="destructive"
                      size="lg"
                      onClick={() =>
                        act(path, 'reject', () =>
                          setTopics((items) =>
                            items.filter((item) => item.id !== topic.id),
                          ),
                        )
                      }
                    >
                      <X data-icon="inline-start" /> Отклонить
                    </Button>
                    <Button
                      disabled={pendingId === path}
                      size="lg"
                      onClick={() =>
                        act(path, 'approve', () =>
                          setTopics((items) =>
                            items.filter((item) => item.id !== topic.id),
                          ),
                        )
                      }
                    >
                      <Check data-icon="inline-start" /> Опубликовать
                    </Button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="px-5 py-12 text-center">
            <Check className="mx-auto size-6 text-emerald-ink" />
            <p className="mt-3 font-heading font-bold">Очередь тем пуста</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Новых публикаций на проверке нет.
            </p>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-muted/45 px-5 py-4">
          <div>
            <h2 className="font-heading font-bold">Открытые жалобы</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Сигналы участников о нарушениях правил.
            </p>
          </div>
          <span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-bold text-amber-ink">
            {reports.length}
          </span>
        </header>
        {reports.length ? (
          reports.map((report) => {
            const path = `/api/moderation/reports/${report.id}`;
            return (
              <article
                key={report.id}
                className="border-t border-border p-5 first:border-t-0"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-amber-ink">
                      <ShieldAlert className="size-4" />
                      <h3 className="font-heading font-bold">
                        {reasonLabels[report.reason] || report.reason}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-6">{report.details}</p>
                    {report.target_slug && (
                      <Link
                        href={`/forum/topic/${report.target_slug}`}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        {report.target_title || 'Открыть тему'}{' '}
                        <ExternalLink className="size-3" />
                      </Link>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Сообщил {report.reporter} · {report.created}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      disabled={pendingId === path}
                      variant="outline"
                      size="lg"
                      onClick={() =>
                        act(path, 'dismiss', () =>
                          setReports((items) =>
                            items.filter((item) => item.id !== report.id),
                          ),
                        )
                      }
                    >
                      Отклонить жалобу
                    </Button>
                    <Button
                      disabled={pendingId === path}
                      size="lg"
                      onClick={() =>
                        act(path, 'resolve', () =>
                          setReports((items) =>
                            items.filter((item) => item.id !== report.id),
                          ),
                        )
                      }
                    >
                      <Check data-icon="inline-start" /> Закрыть
                    </Button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="px-5 py-12 text-center">
            <Check className="mx-auto size-6 text-emerald-ink" />
            <p className="mt-3 font-heading font-bold">Открытых жалоб нет</p>
          </div>
        )}
      </section>
    </div>
  );
}
