'use client';

import { useState } from 'react';
import { Flag, Send } from 'lucide-react';

import { SubscriptionButton } from '@/components/forum/subscription-button';
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

export function TopicActions({
  topicId,
  slug,
  initialSubscribed,
}: {
  topicId: string;
  slug: string;
  initialSubscribed: boolean;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function submitReport(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/forum/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetType: 'topic',
          targetId: topicId,
          reason,
          details,
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok)
        throw new Error(result.message || 'Не удалось отправить жалобу');
      setReportOpen(false);
      setDetails('');
      setMessage('Жалоба передана модераторам');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Не удалось отправить жалобу',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-end gap-2">
        <SubscriptionButton
          targetType="topic"
          slug={slug}
          initialSubscribed={initialSubscribed}
        />
        <span className="inline-flex flex-col items-end gap-1">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setReportOpen(true)}
          >
            <Flag data-icon="inline-start" /> Пожаловаться
          </Button>
          <span
            className="min-h-4 text-[10px] text-muted-foreground"
            aria-live="polite"
          >
            {message}
          </span>
        </span>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submitReport}>
            <DialogHeader>
              <DialogTitle>Жалоба модераторам</DialogTitle>
              <DialogDescription>
                Опишите конкретное нарушение. Заведомо ложные жалобы также
                фиксируются.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 space-y-4">
              <label
                htmlFor="report-reason"
                className="block text-sm font-semibold"
              >
                Причина
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 font-normal"
                >
                  <option value="illegal">Незаконный контент</option>
                  <option value="fraud">Мошенничество</option>
                  <option value="spam">Спам или скрытая реклама</option>
                  <option value="harassment">Оскорбления</option>
                  <option value="personal_data">Персональные данные</option>
                  <option value="other">Другое</option>
                </select>
              </label>
              <div>
                <label
                  htmlFor="report-details"
                  className="block text-sm font-semibold"
                >
                  Подробности
                </label>
                <Textarea
                  id="report-details"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={5}
                  className="mt-2 resize-none font-normal"
                  placeholder="Что именно нарушает правила и где это находится"
                />
              </div>
              {message && (
                <p className="text-xs text-destructive" role="alert">
                  {message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReportOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Отправляем…' : 'Отправить жалобу'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ReplyComposer({
  slug,
  disabledReason,
}: {
  slug: string;
  disabledReason?: string;
}) {
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function submitReply(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/forum/topics/${encodeURIComponent(slug)}/posts`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ body }),
        },
      );
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok)
        throw new Error(result.message || 'Не удалось опубликовать ответ');
      setMessage('Ответ опубликован');
      setBody('');
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Не удалось опубликовать ответ',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-heading font-bold">Ваш ответ</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {disabledReason ||
          'Добавьте контекст, проверяемые факты и при необходимости первичные источники.'}
      </p>
      <form className="mt-4" onSubmit={submitReply}>
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={Boolean(disabledReason) || pending}
          required
          minLength={10}
          maxLength={20_000}
          rows={6}
          className="resize-y"
          placeholder="Напишите содержательный ответ"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p
            className={`text-xs ${message && !message.includes('опубликован') ? 'text-destructive' : 'text-muted-foreground'}`}
            aria-live="polite"
          >
            {message}
          </p>
          <Button disabled={Boolean(disabledReason) || pending} type="submit">
            <Send data-icon="inline-start" />{' '}
            {pending ? 'Публикуем…' : 'Опубликовать ответ'}
          </Button>
        </div>
      </form>
    </section>
  );
}
