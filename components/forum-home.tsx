'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  CircleHelp,
  Code2,
  Database,
  Handshake,
  LayoutGrid,
  Lock,
  Megaphone,
  Newspaper,
  FilePenLine,
  Plus,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wrench,
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
import {
  featuredActivity,
  forumSections,
  forumTotals,
  type ForumNode,
} from '@/lib/forum/catalog';
import { canAccessRole } from '@/lib/forum/access';

const iconMap = {
  code: Code2,
  server: ServerCog,
  database: Database,
  shield: ShieldCheck,
  briefcase: BriefcaseBusiness,
  megaphone: Megaphone,
  handshake: Handshake,
  book: BookOpen,
  tools: Wrench,
  users: UsersRound,
  news: Newspaper,
  help: CircleHelp,
};

const roleLabels: Record<string, string> = {
  member: 'Участник',
  author: 'Автор',
  expert: 'Эксперт',
  pro: 'PRO-участник',
  partner: 'Партнёр',
  moderator: 'Модератор',
  admin: 'Администратор',
};

function ForumRow({ forum }: { forum: ForumNode }) {
  const Icon = iconMap[forum.icon];

  return (
    <article className="grid gap-4 border-t border-border px-4 py-4 transition first:border-t-0 hover:bg-muted/35 sm:px-5 md:grid-cols-[minmax(0,1fr)_90px] xl:grid-cols-[minmax(0,1fr)_90px_230px] xl:items-center">
      <div className="flex min-w-0 gap-3.5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-emerald-soft text-emerald-ink">
          <Icon className="size-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/forum/section/${forum.slug}`}
              className="font-heading text-[16px] font-bold tracking-[-0.015em] transition hover:text-primary"
            >
              {forum.title}
            </Link>
            {forum.access === 'pro' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-violet-ink">
                <Lock className="size-2.5" /> PRO
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {forum.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {forum.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <dl className="hidden text-right text-xs md:block">
        <div>
          <dt className="inline text-muted-foreground">Темы </dt>
          <dd className="inline font-bold tabular-nums">
            {forum.topics.toLocaleString('ru-RU')}
          </dd>
        </div>
        <div className="mt-1">
          <dt className="inline text-muted-foreground">Ответы </dt>
          <dd className="inline font-bold tabular-nums">
            {forum.posts.toLocaleString('ru-RU')}
          </dd>
        </div>
      </dl>

      <Link
        href={`/forum/topic/${forum.lastTopic.slug}`}
        className="group hidden min-w-0 items-center gap-3 rounded-xl p-2 transition hover:bg-background xl:flex"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
          {forum.lastTopic.author.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold group-hover:text-primary">
            {forum.lastTopic.title}
          </span>
          <span className="mt-1 block truncate text-[11px] text-muted-foreground">
            {forum.lastTopic.author} · {forum.lastTopic.updated}
          </span>
        </span>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
      </Link>
    </article>
  );
}

export function ForumHome({
  username,
  role,
  unreadCount = 0,
  initialCompose = false,
  initialForum = 'development',
}: {
  username: string;
  role: string;
  unreadCount?: number;
  initialCompose?: boolean;
  initialForum?: string;
}) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'index' | 'activity'>('index');
  const [newTopicOpen, setNewTopicOpen] = useState(initialCompose);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicBody, setTopicBody] = useState('');
  const [topicForum, setTopicForum] = useState(initialForum);
  const [isCommercial, setIsCommercial] = useState(false);
  const [commercialDisclosure, setCommercialDisclosure] = useState('');
  const [submittingTopic, setSubmittingTopic] = useState(false);
  const [topicMessage, setTopicMessage] = useState('');

  async function submitTopic(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingTopic(true);
    setTopicMessage('');
    try {
      const response = await fetch('/api/forum/topics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          forumSlug: topicForum,
          title: topicTitle,
          body: topicBody,
          isCommercial,
          commercialDisclosure: isCommercial ? commercialDisclosure : undefined,
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        slug?: string;
        status?: string;
        message?: string;
      };
      if (!response.ok || !result.ok || !result.slug)
        throw new Error(result.message || 'Не удалось создать тему');
      window.location.assign(`/forum/topic/${encodeURIComponent(result.slug)}`);
    } catch (error) {
      setTopicMessage(
        error instanceof Error ? error.message : 'Не удалось создать тему',
      );
      setSubmittingTopic(false);
    }
  }

  const visibleSections = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru');
    if (!normalized) return forumSections;
    return forumSections
      .map((section) => ({
        ...section,
        forums: section.forums.filter((forum) =>
          `${forum.title} ${forum.description} ${forum.tags.join(' ')}`
            .toLocaleLowerCase('ru')
            .includes(normalized),
        ),
      }))
      .filter((section) => section.forums.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/forum"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="Основа — форум"
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
            <Link
              href="/forum"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-primary"
            >
              Форум
            </Link>
            <Link
              href="/journal"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Журнал
            </Link>
            <Link
              href="/library"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              База знаний
            </Link>
            <Link
              href="/groups"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Группы
            </Link>
            {['author', 'expert', 'moderator', 'admin'].includes(role) && (
              <Link
                href="/editor"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <FilePenLine className="mr-1 inline size-3.5" /> Редактор
              </Link>
            )}
            {(role === 'moderator' || role === 'admin') && (
              <Link
                href="/moderation"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Модерация
              </Link>
            )}
          </nav>

          <label className="relative ml-auto hidden w-full max-w-[350px] md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Поиск по разделам</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по разделам"
              className="h-9 w-full rounded-xl border border-border bg-muted/55 pl-9 pr-3 text-sm outline-none transition focus:border-primary/40 focus:bg-card focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <Link
            href="/notifications"
            className="relative grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Уведомления"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-accent-strong px-1 text-[9px] font-bold leading-4 text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
          <Button
            className="hidden sm:inline-flex"
            onClick={() => setNewTopicOpen(true)}
          >
            <Plus data-icon="inline-start" />
            Новая тема
          </Button>
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
            {[
              ['/forum', 'Форум'],
              ['/journal', 'Журнал'],
              ['/library', 'База знаний'],
              ['/groups', 'Группы'],
              ...(['author', 'expert', 'moderator', 'admin'].includes(role)
                ? [['/editor', 'Редактор']]
                : []),
              ...(role === 'moderator' || role === 'admin'
                ? [['/moderation', 'Модерация']]
                : []),
            ].map(([href, label], index) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${index === 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1480px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:px-8">
        <section className="min-w-0">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">
                Структура сообщества
              </p>
              <h1 className="mt-1.5 font-heading text-3xl font-bold tracking-[-0.04em] sm:text-[36px]">
                Форумы «Основы»
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                IT, работа, легальный заработок, продвижение и практические
                мануалы — по разделам и без серых схем.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setView('index')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${view === 'index' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="size-3.5" /> Разделы
              </button>
              <button
                type="button"
                onClick={() => setView('activity')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${view === 'activity' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Sparkles className="size-3.5" /> Активность
              </button>
            </div>
          </div>

          <label className="relative mb-4 block md:hidden">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Поиск по разделам</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти раздел или тему"
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>

          {view === 'index' ? (
            <div className="space-y-4">
              {visibleSections.map((section) => (
                <section
                  key={section.slug}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_55px_-48px_rgb(20_39_32/55%)]"
                >
                  <header className="border-b border-border bg-muted/45 px-4 py-3.5 sm:px-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-heading text-[17px] font-bold tracking-[-0.02em]">
                          {section.title}
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                        {section.forums.length} раздела
                      </span>
                    </div>
                  </header>
                  <div>
                    {section.forums.map((forum) => (
                      <ForumRow key={forum.slug} forum={forum} />
                    ))}
                  </div>
                </section>
              ))}
              {visibleSections.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center">
                  <Search className="mx-auto mb-3 size-6 text-muted-foreground" />
                  <p className="font-heading font-bold">Разделы не найдены</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Попробуйте более общий запрос.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <header className="border-b border-border bg-muted/45 px-5 py-4">
                <h2 className="font-heading font-bold">Последняя активность</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Новые и недавно обновлённые обсуждения из доступных разделов.
                </p>
              </header>
              {featuredActivity.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/forum/topic/${topic.slug}`}
                  className="flex items-center gap-3 border-t border-border px-5 py-4 first:border-t-0 transition hover:bg-muted/35"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                    {topic.author.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="truncate text-sm">
                        {topic.title}
                      </strong>
                      {topic.access === 'pro' && (
                        <span className="rounded-full bg-violet-soft px-2 py-0.5 text-[9px] font-bold text-violet-ink">
                          PRO
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {topic.forum} · {topic.author} · {topic.updated}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-full bg-amber-soft text-sm font-bold uppercase text-amber-ink">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-heading font-bold">{username}</p>
                <p className="text-xs text-muted-foreground">
                  {roleLabels[role] || role}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/account/security"
                className="rounded-xl border border-border px-3 py-2 text-center text-xs font-semibold transition hover:bg-muted"
              >
                Личный кабинет
              </Link>
              <Link
                href="/access"
                className="rounded-xl border border-border px-3 py-2 text-center text-xs font-semibold transition hover:bg-muted"
              >
                Доступы
              </Link>
              {(role === 'moderator' || role === 'admin') && (
                <Link
                  href="/moderation"
                  className="col-span-2 rounded-xl border border-emerald-ink/20 bg-emerald-soft px-3 py-2 text-center text-xs font-semibold text-emerald-ink transition hover:brightness-95"
                >
                  Очередь модерации
                </Link>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Сообщество
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Разделов</dt>
                <dd className="font-bold tabular-nums">{forumTotals.forums}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Тем</dt>
                <dd className="font-bold tabular-nums">
                  {forumTotals.topics.toLocaleString('ru-RU')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Сообщений</dt>
                <dd className="font-bold tabular-nums">
                  {forumTotals.posts.toLocaleString('ru-RU')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Сейчас онлайн</dt>
                <dd className="font-bold text-emerald-ink">34</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-emerald-ink/15 bg-emerald-soft p-5 text-emerald-ink">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              <h2 className="font-heading text-sm font-bold">
                Только легальные темы
              </h2>
            </div>
            <p className="mt-2 text-xs leading-5 opacity-80">
              Запрещены обман, чужие аккаунты, фишинг, вредоносное ПО и обход
              защит. Реклама и реферальные ссылки маркируются.
            </p>
            <Link
              href="/forum/section/rules-and-help"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold hover:underline"
            >
              Правила публикации <ChevronRight className="size-3" />
            </Link>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <UsersRound className="size-4 text-violet-ink" />
              <h2 className="font-heading text-sm font-bold">Группы и клубы</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Профессиональные группы существуют отдельно от ролей и уровней
              доступа.
            </p>
            <Link
              href="/groups"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              Перейти к группам <ChevronRight className="size-3" />
            </Link>
          </section>
        </aside>
      </main>

      <Dialog open={newTopicOpen} onOpenChange={setNewTopicOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submitTopic}>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl font-bold">
                Новая тема
              </DialogTitle>
              <DialogDescription>
                Тема сохраняется в локальной базе. Разделы заработка и рекламы
                проходят премодерацию.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 space-y-4">
              <label
                htmlFor="topic-title"
                className="block text-sm font-semibold"
              >
                Заголовок
              </label>
              <input
                id="topic-title"
                value={topicTitle}
                onChange={(event) => setTopicTitle(event.target.value)}
                required
                minLength={8}
                maxLength={140}
                placeholder="Коротко сформулируйте тему"
                className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus:ring-4 focus:ring-primary/10"
              />
              <label
                htmlFor="topic-forum"
                className="block text-sm font-semibold"
              >
                Раздел
              </label>
              <select
                id="topic-forum"
                value={topicForum}
                onChange={(event) => setTopicForum(event.target.value)}
                className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus:ring-4 focus:ring-primary/10"
              >
                {forumSections
                  .flatMap((section) => section.forums)
                  .filter((forum) => canAccessRole(role, forum.access))
                  .map((forum) => (
                    <option key={forum.slug} value={forum.slug}>
                      {forum.title}
                      {forum.access === 'pro' ? ' — PRO' : ''}
                    </option>
                  ))}
              </select>
              <div>
                <label
                  htmlFor="topic-body"
                  className="block text-sm font-semibold"
                >
                  Текст темы
                </label>
                <Textarea
                  id="topic-body"
                  value={topicBody}
                  onChange={(event) => setTopicBody(event.target.value)}
                  required
                  minLength={40}
                  maxLength={50_000}
                  rows={7}
                  className="mt-2 resize-y font-normal"
                  placeholder="Опишите исходные условия, подход, результат и ограничения"
                />
              </div>
              <label
                htmlFor="topic-commercial"
                aria-label="Коммерческий или партнёрский материал"
                className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm"
              >
                <input
                  id="topic-commercial"
                  type="checkbox"
                  checked={isCommercial}
                  onChange={(event) => setIsCommercial(event.target.checked)}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <strong className="block">
                    Коммерческий или партнёрский материал
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Отметьте рекламу, реферальную ссылку или иную выгоду автора.
                  </span>
                </span>
              </label>
              {isCommercial && (
                <div>
                  <label
                    htmlFor="topic-disclosure"
                    className="block text-sm font-semibold"
                  >
                    Раскрытие заинтересованности
                  </label>
                  <Textarea
                    id="topic-disclosure"
                    value={commercialDisclosure}
                    onChange={(event) =>
                      setCommercialDisclosure(event.target.value)
                    }
                    required
                    minLength={20}
                    maxLength={500}
                    rows={3}
                    className="mt-2 resize-none font-normal"
                    placeholder="Какую выгоду получает автор и на каких условиях"
                  />
                </div>
              )}
              <div className="rounded-xl border border-amber-ink/15 bg-amber-soft p-3 text-xs leading-5 text-amber-ink">
                Незаконные схемы, обман, чужие данные и обход ограничений
                запрещены. Коммерческая связь раскрывается явно.
              </div>
              {topicMessage && (
                <p className="text-xs text-destructive" role="alert">
                  {topicMessage}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewTopicOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={submittingTopic}>
                {submittingTopic ? 'Публикуем…' : 'Создать тему'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
