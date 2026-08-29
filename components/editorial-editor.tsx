'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GitBranch,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Undo2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type WorkflowStatus = 'draft' | 'pending' | 'published' | 'rejected';

export type EditorialWorkspaceRecord = {
  id: string;
  contentType: 'article' | 'manual';
  slug: string;
  author: string;
  publicStatus: string;
  publishedAt: number | null;
  canPublish: boolean;
  latest: {
    revision: number;
    workflowStatus: string;
    title: string;
    summary: string;
    body: string;
    accessLevel: 'member' | 'pro';
    isCommercial: boolean;
    commercialDisclosure: string;
    changeNote: string;
    discussionSlug: string;
    editor: string;
    created: string;
  };
  history: Array<{
    revision: number;
    workflow_status: string;
    title: string;
    change_note: string;
    created_at: number;
    editor: string;
    discussion_slug: string | null;
    created: string;
  }>;
};

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  pending: 'На проверке',
  published: 'Опубликовано',
  rejected: 'На доработке',
};

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'published'
      ? 'default'
      : status === 'rejected'
        ? 'destructive'
        : status === 'pending'
          ? 'secondary'
          : 'outline';
  return <Badge variant={variant}>{statusLabels[status] || status}</Badge>;
}

export function EditorialEditor({
  record,
}: {
  record?: EditorialWorkspaceRecord;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [contentType, setContentType] = useState<'article' | 'manual'>(
    record?.contentType || 'article',
  );
  const [title, setTitle] = useState(record?.latest.title || '');
  const [summary, setSummary] = useState(record?.latest.summary || '');
  const [body, setBody] = useState(record?.latest.body || '');
  const [accessLevel, setAccessLevel] = useState<'member' | 'pro'>(
    record?.latest.accessLevel || 'member',
  );
  const [discussionSlug, setDiscussionSlug] = useState(
    record?.latest.discussionSlug || '',
  );
  const [isCommercial, setIsCommercial] = useState(
    record?.latest.isCommercial || false,
  );
  const [commercialDisclosure, setCommercialDisclosure] = useState(
    record?.latest.commercialDisclosure || '',
  );
  const [changeNote, setChangeNote] = useState(record?.latest.changeNote || '');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const payload = {
    title,
    summary,
    body,
    accessLevel,
    discussionSlug: discussionSlug || undefined,
    isCommercial,
    commercialDisclosure: isCommercial
      ? commercialDisclosure || undefined
      : undefined,
    changeNote: changeNote || undefined,
  };

  async function runAction(
    action: 'create' | 'save' | 'submit' | 'publish' | 'reject',
  ) {
    if (!formRef.current?.reportValidity()) return;
    setSubmitting(action);
    setMessage('');
    try {
      const response = await fetch(
        record
          ? `/api/editor/content/${encodeURIComponent(record.id)}`
          : '/api/editor/content',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            record ? { action, ...payload } : { contentType, ...payload },
          ),
        },
      );
      const result = (await response.json()) as {
        ok: boolean;
        id?: string;
        revision?: number;
        message?: string;
      };
      if (!response.ok || !result.ok)
        throw new Error(result.message || 'Не удалось сохранить материал');
      if (!record && result.id) {
        window.location.assign(`/editor/${encodeURIComponent(result.id)}`);
        return;
      }
      setMessage(
        action === 'publish'
          ? 'Редакция опубликована.'
          : action === 'reject'
            ? 'Материал возвращён автору.'
            : action === 'submit'
              ? 'Материал отправлен редакции.'
              : `Создана редакция ${result.revision}.`,
      );
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Не удалось сохранить материал',
      );
      setSubmitting(null);
    }
  }

  async function restoreRevision(revision: number) {
    if (!record) return;
    setSubmitting(`restore-${revision}`);
    setMessage('');
    try {
      const response = await fetch(
        `/api/editor/content/${encodeURIComponent(record.id)}/restore`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ revision }),
        },
      );
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok)
        throw new Error(result.message || 'Не удалось восстановить редакцию');
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Не удалось восстановить редакцию',
      );
      setSubmitting(null);
    }
  }

  const publicHref = record
    ? `/${record.contentType === 'article' ? 'journal' : 'library'}/${record.slug}`
    : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form
        ref={formRef}
        className="overflow-hidden rounded-2xl border border-border bg-card"
        onSubmit={(event) => {
          event.preventDefault();
          void runAction(record ? 'save' : 'create');
        }}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/45 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/editor"
              aria-label="Вернуться в редакцию"
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            >
              <ArrowLeft />
            </Link>
            <div>
              <p className="font-heading font-bold">
                {record ? record.latest.title : 'Новый материал'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {record
                  ? `${record.author} · редакция ${record.latest.revision}`
                  : 'Сначала сохраните черновик'}
              </p>
            </div>
          </div>
          {record && (
            <div className="flex items-center gap-2">
              <StatusBadge status={record.latest.workflowStatus} />
              {record.publicStatus === 'published' && (
                <Badge variant="outline">Есть публичная версия</Badge>
              )}
            </div>
          )}
        </header>

        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">
              Тип материала
              <NativeSelect
                className="w-full"
                value={contentType}
                disabled={Boolean(record)}
                onChange={(event) =>
                  setContentType(event.target.value as 'article' | 'manual')
                }
              >
                <NativeSelectOption value="article">
                  Статья журнала
                </NativeSelectOption>
                <NativeSelectOption value="manual">
                  Мануал базы знаний
                </NativeSelectOption>
              </NativeSelect>
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Уровень доступа
              <NativeSelect
                className="w-full"
                value={accessLevel}
                onChange={(event) =>
                  setAccessLevel(event.target.value as 'member' | 'pro')
                }
              >
                <NativeSelectOption value="member">
                  Участники
                </NativeSelectOption>
                <NativeSelectOption value="pro">Только PRO</NativeSelectOption>
              </NativeSelect>
            </label>
          </div>

          <label className="block space-y-2 text-sm font-semibold">
            Заголовок
            <Input
              required
              minLength={8}
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Точный и полезный заголовок без обещаний"
            />
          </label>

          <label className="block space-y-2 text-sm font-semibold">
            Краткое описание
            <Textarea
              required
              minLength={20}
              maxLength={500}
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Что читатель получит и для кого предназначен материал"
            />
          </label>

          <label className="block space-y-2 text-sm font-semibold">
            Текст материала
            <Textarea
              required
              minLength={80}
              maxLength={100000}
              rows={22}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="font-mono text-[13px] leading-6"
              placeholder="Структурируйте материал подзаголовками и короткими абзацами…"
            />
            <span className="block text-right text-[11px] font-normal text-muted-foreground">
              {body.length.toLocaleString('ru-RU')} знаков
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-semibold">
              Slug темы обсуждения
              <Input
                maxLength={160}
                value={discussionSlug}
                onChange={(event) => setDiscussionSlug(event.target.value)}
                placeholder="naprimer-obsuzhdenie-materiala"
              />
              <span className="block text-[11px] font-normal leading-4 text-muted-foreground">
                Необязательно. Берётся из адреса /forum/topic/…
              </span>
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Комментарий к редакции
              <Textarea
                maxLength={500}
                rows={3}
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
                placeholder="Что изменилось или что нужно доработать"
              />
            </label>
          </div>

          <section className="rounded-xl border border-border bg-muted/35 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Коммерческий материал</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Включите для рекламы, партнёрской ссылки или выгоды автора.
                </p>
              </div>
              <Switch
                checked={isCommercial}
                onCheckedChange={setIsCommercial}
                aria-label="Коммерческий материал"
              />
            </div>
            {isCommercial && (
              <label className="mt-4 block space-y-2 text-sm font-semibold">
                Раскрытие коммерческой связи
                <Textarea
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  value={commercialDisclosure}
                  onChange={(event) =>
                    setCommercialDisclosure(event.target.value)
                  }
                  placeholder="Кто получает выгоду и на каких условиях"
                />
              </label>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/35 px-5 py-4 sm:px-6">
          <Button type="submit" disabled={Boolean(submitting)}>
            <Save data-icon="inline-start" />
            {record ? 'Сохранить редакцию' : 'Создать черновик'}
          </Button>
          {record && (
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(submitting)}
              onClick={() => void runAction('submit')}
            >
              <Send data-icon="inline-start" /> На проверку
            </Button>
          )}
          {record?.canPublish && (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={Boolean(submitting)}
                onClick={() => void runAction('publish')}
              >
                <CheckCircle2 data-icon="inline-start" /> Опубликовать
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={
                  Boolean(submitting) ||
                  record.latest.workflowStatus !== 'pending'
                }
                onClick={() => void runAction('reject')}
              >
                <Undo2 data-icon="inline-start" /> Вернуть автору
              </Button>
            </>
          )}
          <span
            className="ml-auto text-xs font-medium text-muted-foreground"
            aria-live="polite"
          >
            {submitting ? 'Сохраняем…' : message}
          </span>
        </footer>
      </form>

      <aside className="space-y-4">
        {record?.publicStatus === 'published' && publicHref && (
          <section className="rounded-2xl border border-emerald-ink/15 bg-emerald-soft p-5 text-emerald-ink">
            <ShieldCheck className="size-5" />
            <h2 className="mt-4 font-heading font-bold">
              Публичная версия защищена
            </h2>
            <p className="mt-2 text-xs leading-5 opacity-80">
              Черновики не меняют опубликованный текст до решения редакции.
            </p>
            <Link
              href={publicHref}
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold"
            >
              Открыть публикацию <ExternalLink className="size-3" />
            </Link>
          </section>
        )}

        {record?.latest.discussionSlug && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-heading font-bold">Обсуждение</h2>
            <p className="mt-2 break-all text-xs text-muted-foreground">
              {record.latest.discussionSlug}
            </p>
            <Link
              href={`/forum/topic/${record.latest.discussionSlug}`}
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary"
            >
              Перейти в тему <ExternalLink className="size-3" />
            </Link>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border bg-muted/45 px-5 py-4">
            <GitBranch className="size-4 text-violet-ink" />
            <h2 className="font-heading font-bold">История редакций</h2>
          </header>
          {record ? (
            <div className="divide-y divide-border">
              {record.history.map((revision, index) => (
                <article key={revision.revision} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">
                        v{revision.revision}
                      </span>
                      <StatusBadge status={revision.workflow_status} />
                    </div>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        disabled={Boolean(submitting)}
                        onClick={() => void restoreRevision(revision.revision)}
                      >
                        <RotateCcw /> В черновик
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold">
                    {revision.title}
                  </p>
                  {revision.change_note && (
                    <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-muted-foreground">
                      {revision.change_note}
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock3 className="size-3" /> {revision.editor} ·{' '}
                    {revision.created}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-5 text-xs leading-5 text-muted-foreground">
              После первого сохранения здесь появятся версии, статусы и
              безопасный откат.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading font-bold">Перед отправкой</h2>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
            <li>Факты и результат можно проверить.</li>
            <li>Способ законен и не обещает гарантированный доход.</li>
            <li>Реклама и выгода автора раскрыты явно.</li>
            <li>Опасные команды содержат предупреждения и откат.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
