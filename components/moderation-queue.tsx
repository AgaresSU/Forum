'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Ban,
  Check,
  ExternalLink,
  Hand,
  History,
  ShieldAlert,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type PendingTopic = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  is_commercial: number;
  commercial_disclosure: string | null;
  forum_title: string;
  author: string;
  assigned_to_id: string | null;
  assigned_to: string | null;
  resubmission_count: number;
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
  assigned_to: string | null;
  created: string;
};

type HistoryItem = {
  action: string;
  note: string;
  actor: string;
  topic_slug: string | null;
  topic_title: string | null;
  report_id: string | null;
  created: string;
};

type Decision = {
  topic: PendingTopic;
  action: 'reject' | 'block';
};

type ReportDecision = {
  report: OpenReport;
  action: 'resolve' | 'dismiss';
};

const reasonLabels: Record<string, string> = {
  illegal: 'Незаконный контент',
  fraud: 'Мошенничество',
  spam: 'Спам или реклама',
  harassment: 'Оскорбления',
  personal_data: 'Персональные данные',
  other: 'Другое',
};

const actionLabels: Record<string, string> = {
  claimed: 'Взято в работу',
  approve: 'Тема опубликована',
  reject: 'Тема возвращена на доработку',
  block: 'Тема заблокирована',
  resubmitted: 'Тема повторно отправлена',
  resolve: 'Жалоба закрыта',
  dismiss: 'Жалоба отклонена',
};

export function ModerationQueue({
  initialTopics,
  initialReports,
  initialHistory,
  moderatorName,
  isAdmin,
}: {
  initialTopics: PendingTopic[];
  initialReports: OpenReport[];
  initialHistory: HistoryItem[];
  moderatorName: string;
  isAdmin: boolean;
}) {
  const [topics, setTopics] = useState(initialTopics);
  const [reports, setReports] = useState(initialReports);
  const [history, setHistory] = useState(initialHistory);
  const [pendingId, setPendingId] = useState('');
  const [message, setMessage] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [reportDecision, setReportDecision] = useState<ReportDecision | null>(
    null,
  );
  const [reportNote, setReportNote] = useState('');

  async function act(
    path: string,
    action: string,
    note: string,
    afterSuccess: () => void,
  ) {
    setPendingId(path);
    setMessage('');
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, note }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok)
        throw new Error(result.message || 'Не удалось выполнить действие');
      afterSuccess();
      setHistory((items) => [
        {
          action: action === 'claim' ? 'claimed' : action,
          note,
          actor: moderatorName,
          topic_slug: decision?.topic.slug || null,
          topic_title: decision?.topic.title || null,
          report_id: path.includes('/reports/')
            ? path.split('/').at(-1) || null
            : null,
          created: 'только что',
        },
        ...items,
      ]);
      setMessage('Решение сохранено в локальной базе');
      setDecision(null);
      setDecisionNote('');
      setReportDecision(null);
      setReportNote('');
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

  async function submitDecision(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision) return;
    const path = `/api/moderation/topics/${decision.topic.id}`;
    await act(path, decision.action, decisionNote, () =>
      setTopics((items) =>
        items.filter((item) => item.id !== decision.topic.id),
      ),
    );
  }

  async function submitReportDecision(
    event: React.SyntheticEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!reportDecision) return;
    const path = `/api/moderation/reports/${reportDecision.report.id}`;
    await act(path, reportDecision.action, reportNote, () =>
      setReports((items) =>
        items.filter((item) => item.id !== reportDecision.report.id),
      ),
    );
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
              Назначьте ответственного перед решением. Отклонение и блокировка
              требуют комментария.
            </p>
          </div>
          <span className="rounded-full bg-violet-soft px-2.5 py-1 text-xs font-bold text-violet-ink">
            {topics.length}
          </span>
        </header>
        {topics.length ? (
          topics.map((topic) => {
            const path = `/api/moderation/topics/${topic.id}`;
            const assignedElsewhere = Boolean(
              topic.assigned_to &&
              topic.assigned_to !== moderatorName &&
              !isAdmin,
            );
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
                      {topic.resubmission_count > 0 && (
                        <span className="rounded-full bg-violet-soft px-2 py-0.5 text-[9px] font-bold uppercase text-violet-ink">
                          Повторная подача · {topic.resubmission_count}
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
                      {topic.author} · {topic.created} · Ответственный:{' '}
                      <strong className="text-foreground">
                        {topic.assigned_to || 'не назначен'}
                      </strong>
                    </p>
                  </div>
                  <div className="flex max-w-[390px] shrink-0 flex-wrap justify-end gap-2">
                    <Link
                      href={`/forum/topic/${topic.slug}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
                    >
                      <ExternalLink className="size-3.5" /> Открыть
                    </Link>
                    {!topic.assigned_to && (
                      <Button
                        disabled={pendingId === path}
                        variant="outline"
                        size="lg"
                        onClick={() =>
                          act(path, 'claim', '', () =>
                            setTopics((items) =>
                              items.map((item) =>
                                item.id === topic.id
                                  ? { ...item, assigned_to: moderatorName }
                                  : item,
                              ),
                            ),
                          )
                        }
                      >
                        <Hand data-icon="inline-start" /> Взять в работу
                      </Button>
                    )}
                    <Button
                      disabled={pendingId === path || assignedElsewhere}
                      variant="destructive"
                      size="lg"
                      onClick={() => setDecision({ topic, action: 'block' })}
                    >
                      <Ban data-icon="inline-start" /> Блокировать
                    </Button>
                    <Button
                      disabled={pendingId === path || assignedElsewhere}
                      variant="outline"
                      size="lg"
                      onClick={() => setDecision({ topic, action: 'reject' })}
                    >
                      <X data-icon="inline-start" /> На доработку
                    </Button>
                    <Button
                      disabled={pendingId === path || assignedElsewhere}
                      size="lg"
                      onClick={() =>
                        act(path, 'approve', '', () =>
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
            const assignedElsewhere = Boolean(
              report.assigned_to &&
              report.assigned_to !== moderatorName &&
              !isAdmin,
            );
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
                      Сообщил {report.reporter} · {report.created} ·
                      Ответственный:{' '}
                      <strong className="text-foreground">
                        {report.assigned_to || 'не назначен'}
                      </strong>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    {!report.assigned_to && (
                      <Button
                        disabled={pendingId === path}
                        variant="outline"
                        size="lg"
                        onClick={() =>
                          act(path, 'claim', '', () =>
                            setReports((items) =>
                              items.map((item) =>
                                item.id === report.id
                                  ? { ...item, assigned_to: moderatorName }
                                  : item,
                              ),
                            ),
                          )
                        }
                      >
                        <Hand data-icon="inline-start" /> Взять в работу
                      </Button>
                    )}
                    <Button
                      disabled={pendingId === path || assignedElsewhere}
                      variant="outline"
                      size="lg"
                      onClick={() =>
                        setReportDecision({ report, action: 'dismiss' })
                      }
                    >
                      Отклонить жалобу
                    </Button>
                    <Button
                      disabled={pendingId === path || assignedElsewhere}
                      size="lg"
                      onClick={() =>
                        setReportDecision({ report, action: 'resolve' })
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

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border bg-muted/45 px-5 py-4">
          <History className="size-4 text-muted-foreground" />
          <h2 className="font-heading font-bold">История решений</h2>
        </header>
        {history.length ? (
          <ol>
            {history.map((item, index) => (
              <li
                key={`${item.action}-${item.created}-${index}`}
                className="border-t border-border px-5 py-4 text-sm first:border-t-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{actionLabels[item.action] || item.action}</strong>
                  <span className="text-xs text-muted-foreground">
                    {item.actor} · {item.created}
                  </span>
                </div>
                {item.topic_slug && (
                  <Link
                    href={`/forum/topic/${item.topic_slug}`}
                    className="mt-1 block text-xs font-semibold text-primary hover:underline"
                  >
                    {item.topic_title}
                  </Link>
                )}
                {item.note && (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {item.note}
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Решений пока нет.
          </p>
        )}
      </section>

      <Dialog
        open={Boolean(decision)}
        onOpenChange={(open) => !open && setDecision(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submitDecision}>
            <DialogHeader>
              <DialogTitle>
                {decision?.action === 'block'
                  ? 'Заблокировать тему'
                  : 'Вернуть тему на доработку'}
              </DialogTitle>
              <DialogDescription>
                Автор увидит комментарий и получит уведомление. Решение
                останется в истории.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5">
              <label htmlFor="decision-note" className="text-sm font-semibold">
                Комментарий модератора
              </label>
              <Textarea
                id="decision-note"
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                required
                minLength={10}
                maxLength={2_000}
                rows={5}
                className="mt-2 resize-none"
                placeholder="Что нарушено или что необходимо исправить"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDecision(null)}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                variant={
                  decision?.action === 'block' ? 'destructive' : 'default'
                }
                disabled={Boolean(pendingId)}
              >
                Сохранить решение
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reportDecision)}
        onOpenChange={(open) => !open && setReportDecision(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submitReportDecision}>
            <DialogHeader>
              <DialogTitle>
                {reportDecision?.action === 'resolve'
                  ? 'Закрыть жалобу'
                  : 'Отклонить жалобу'}
              </DialogTitle>
              <DialogDescription>
                Заявитель получит уведомление, а действие останется в истории.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5">
              <label htmlFor="report-note" className="text-sm font-semibold">
                Комментарий к решению
              </label>
              <Textarea
                id="report-note"
                value={reportNote}
                onChange={(event) => setReportNote(event.target.value)}
                maxLength={2_000}
                rows={4}
                className="mt-2 resize-none"
                placeholder="Что проверено и какое решение принято"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReportDecision(null)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={Boolean(pendingId)}>
                Сохранить решение
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
