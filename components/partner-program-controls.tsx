'use client';

import { useState } from 'react';
import { Check, CirclePause, Send, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

const categories = [
  ['hosting', 'Хостинг и инфраструктура'],
  ['devtools', 'Инструменты разработки'],
  ['education', 'Образование'],
  ['saas', 'SaaS и сервисы'],
  ['finance', 'Финансовые сервисы'],
  ['other', 'Другое'],
] as const;

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/35 focus:ring-4 focus:ring-primary/10';

export function PartnerProgramSubmission({ role }: { role: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'Не удалось сохранить программу');
      }
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Не удалось сохранить программу',
      );
      setPending(false);
    }
  }

  return (
    <details className="group rounded-2xl border border-primary/15 bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-heading font-bold marker:hidden">
        <span>Добавить партнёрскую программу</span>
        <span className="text-xs font-semibold text-muted-foreground group-open:hidden">
          Открыть форму
        </span>
      </summary>
      <form onSubmit={submit} className="border-t border-border px-5 py-5">
        <p className="mb-5 max-w-3xl text-sm leading-6 text-muted-foreground">
          {role === 'admin'
            ? 'Запись администратора публикуется сразу.'
            : 'Заявка появится в каталоге после проверки администратором.'}{' '}
          Реферальная ссылка и выгода автора всегда показываются пользователю.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold">
            Название
            <input name="name" required minLength={3} maxLength={100} className={fieldClass} />
          </label>
          <label className="text-xs font-semibold">
            Категория
            <select name="category" required className={fieldClass} defaultValue="devtools">
              {categories.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold md:col-span-2">
            Описание
            <textarea name="description" required minLength={40} maxLength={1500} rows={3} className={fieldClass} />
          </label>
          <label className="text-xs font-semibold">
            Официальный сайт (HTTPS)
            <input name="websiteUrl" required type="url" pattern="https://.*" className={fieldClass} />
          </label>
          <label className="text-xs font-semibold">
            Реферальная ссылка (HTTPS)
            <input name="referralUrl" required type="url" pattern="https://.*" className={fieldClass} />
          </label>
          <label className="text-xs font-semibold">
            Вознаграждение
            <textarea name="rewardSummary" required minLength={10} maxLength={300} rows={3} className={fieldClass} />
          </label>
          <label className="text-xs font-semibold">
            Условия выплат
            <textarea name="payoutTerms" required minLength={20} maxLength={500} rows={3} className={fieldClass} />
          </label>
          <label className="text-xs font-semibold md:col-span-2">
            Раскрытие партнёрской выгоды
            <textarea
              name="commercialDisclosure"
              required
              minLength={20}
              maxLength={500}
              rows={3}
              placeholder="Например: автор получает комиссию после оплаты, цена для пользователя не меняется."
              className={fieldClass}
            />
          </label>
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-xs text-destructive" aria-live="polite">{message}</p>
          <Button type="submit" disabled={pending}>
            <Send /> {pending ? 'Сохраняем…' : role === 'admin' ? 'Опубликовать' : 'Отправить на проверку'}
          </Button>
        </div>
      </form>
    </details>
  );
}

export function PartnerProgramReview({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function review(nextStatus: 'published' | 'paused' | 'rejected') {
    const note =
      nextStatus === 'rejected'
        ? window.prompt('Причина отклонения (не менее 10 символов):')
        : '';
    if (nextStatus === 'rejected' && !note) return;
    setPending(true);
    setMessage('');
    try {
      const response = await fetch(`/api/partners/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, note }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'Не удалось изменить статус');
      }
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось изменить статус');
      setPending(false);
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">
        {status !== 'published' && (
          <Button size="sm" disabled={pending} onClick={() => void review('published')}>
            <Check /> Опубликовать
          </Button>
        )}
        {status !== 'paused' && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => void review('paused')}>
            <CirclePause /> Приостановить
          </Button>
        )}
        {status !== 'rejected' && (
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => void review('rejected')}>
            <X /> Отклонить
          </Button>
        )}
      </div>
      {message && <p className="mt-2 text-xs text-destructive" aria-live="polite">{message}</p>}
    </div>
  );
}
