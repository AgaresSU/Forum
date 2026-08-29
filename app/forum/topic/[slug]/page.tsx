import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronRight,
  Lock,
  MessageCircleReply,
  MoreHorizontal,
  ShieldCheck,
} from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import {
  ReplyComposer,
  ResubmitEditor,
  TopicActions,
} from '@/components/forum/topic-interactions';
import { ContributionMark, ReactionBar } from '@/components/forum/reaction-bar';
import { buttonVariants } from '@/components/ui/button';
import { canAccessRole, decodeRouteValue } from '@/lib/forum/access';
import { getTopicView } from '@/lib/forum/repository';
import {
  getContributionSummaries,
  getReactionSummaries,
  reactionSummaryKey,
} from '@/lib/forum/reactions';
import { findTopic, getForumBySlug } from '@/lib/forum/sample-content';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  pending: 'На модерации',
  rejected: 'Отклонено',
  blocked: 'Заблокировано',
};

const actionLabels: Record<string, string> = {
  claimed: 'Взято в работу',
  approve: 'Опубликовано',
  reject: 'Возвращено на доработку',
  block: 'Заблокировано',
  resubmitted: 'Повторно отправлено',
};

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireCommunityUser();
  const routeParams = await params;
  const slug = decodeRouteValue(routeParams.slug);
  const topic = await getTopicView(slug, user);

  if (!topic) {
    const preview = findTopic(slug);
    if (!preview) notFound();
    if (canAccessRole(user.role, preview.topic.access)) notFound();

    return (
      <div className="min-h-screen bg-background text-foreground">
        <CommunityHeader
          username={user.username}
          userId={user.id}
          role={user.role}
          active="forum"
        />
        <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
          <nav
            aria-label="Хлебные крошки"
            className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          >
            <Link href="/forum">Форум</Link>
            <ChevronRight className="size-3" />
            <span>{preview.section.title}</span>
          </nav>
          <header className="mb-6 border-b border-border pb-6">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-2 py-1 text-[9px] font-bold uppercase text-violet-ink">
              <Lock className="size-2.5" /> PRO
            </span>
            <h1 className="mt-3 max-w-4xl font-heading text-3xl font-bold tracking-[-0.04em]">
              {preview.topic.title}
            </h1>
          </header>
          <section className="rounded-2xl border border-violet-ink/15 bg-violet-soft px-6 py-14 text-center text-violet-ink">
            <Lock className="mx-auto size-7" />
            <h2 className="mt-4 font-heading text-xl font-bold">
              Тема доступна участникам PRO
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 opacity-80">
              Уровень доступа проверяется на сервере. Содержимое и ответы
              скрыты.
            </p>
            <Link
              href="/access"
              className={buttonVariants({
                variant: 'outline',
                className:
                  'mt-5 border-violet-ink/20 bg-background text-foreground',
              })}
            >
              Посмотреть уровни доступа
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const found = getForumBySlug(topic.forumSlug);
  if (!found) notFound();
  const [reactionSummaries, contributionSummaries] = await Promise.all([
    getReactionSummaries(user.id, [
      { targetType: 'topic', targetId: topic.id },
      ...topic.posts.slice(1).map((post) => ({
        targetType: 'post' as const,
        targetId: post.id,
      })),
    ]),
    getContributionSummaries([
      topic.authorId,
      ...topic.posts.map((post) => post.authorId),
    ]),
  ]);
  const { section, forum } = found;
  const disabledReason = topic.locked
    ? 'Обсуждение закрыто модератором.'
    : topic.status === 'pending'
      ? 'Ответы откроются после публикации темы модератором.'
      : topic.status === 'rejected'
        ? 'Отклонённая тема недоступна для обсуждения.'
        : topic.status === 'blocked'
          ? 'Тема заблокирована модератором.'
          : undefined;
  const isAuthor = topic.authorId === user.id;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active="forum"
      />
      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        >
          <Link href="/forum" className="transition hover:text-foreground">
            Форум
          </Link>
          <ChevronRight className="size-3" />
          <span>{section.title}</span>
          <ChevronRight className="size-3" />
          <Link
            href={`/forum/section/${forum.slug}`}
            className="transition hover:text-foreground"
          >
            {forum.title}
          </Link>
        </nav>

        <header className="mb-6 border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-2">
            {topic.pinned && (
              <span className="rounded-full bg-amber-soft px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-amber-ink">
                Закреплено
              </span>
            )}
            {topic.access === 'pro' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-violet-ink">
                <Lock className="size-2.5" /> PRO
              </span>
            )}
            {topic.commercial && (
              <span className="rounded-full bg-amber-soft px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-amber-ink">
                Партнёрский материал
              </span>
            )}
            {statusLabels[topic.status] && (
              <span className="rounded-full bg-muted px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {statusLabels[topic.status]}
              </span>
            )}
          </div>
          <h1 className="mt-3 max-w-4xl font-heading text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl">
            {topic.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {topic.excerpt}
          </p>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
            <p className="pt-2 text-xs text-muted-foreground">
              Автор: <strong className="text-foreground">{topic.author}</strong>{' '}
              · обновлено {topic.updated}
            </p>
            <TopicActions
              topicId={topic.id}
              slug={topic.slug}
              initialSubscribed={topic.subscribed}
            />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]">
          <section>
            {topic.status === 'pending' && (
              <div className="mb-4 rounded-2xl border border-violet-ink/15 bg-violet-soft p-4 text-sm text-violet-ink">
                Тема сохранена и видна автору. После проверки модератор
                опубликует её в разделе или отклонит с последующей доработкой.
                {topic.assignedTo && (
                  <span className="mt-2 block font-semibold">
                    Ответственный: {topic.assignedTo}
                  </span>
                )}
              </div>
            )}
            {(topic.status === 'rejected' || topic.status === 'blocked') &&
              topic.moderationNote && (
                <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  <strong className="block font-heading">
                    Комментарий модератора
                  </strong>
                  <span className="mt-2 block leading-6">
                    {topic.moderationNote}
                  </span>
                </div>
              )}
            {topic.status === 'rejected' && isAuthor && (
              <ResubmitEditor
                slug={topic.slug}
                initialBody={topic.posts[0]?.body.join('\n\n') || ''}
                isCommercial={topic.commercial}
                initialDisclosure={topic.commercialDisclosure || ''}
              />
            )}
            {topic.commercial && (
              <div className="mb-4 flex gap-3 rounded-2xl border border-amber-ink/15 bg-amber-soft p-4 text-amber-ink">
                <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                <div>
                  <h2 className="font-heading text-sm font-bold">
                    Раскрытие заинтересованности
                  </h2>
                  <p className="mt-1 text-xs leading-5 opacity-80">
                    {topic.commercialDisclosure}
                  </p>
                </div>
              </div>
            )}

            <ol className="space-y-4">
              {topic.posts.map((post, index) => (
                <li key={post.id} id={`post-${post.id}`}>
                  <article className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="grid sm:grid-cols-[150px_minmax(0,1fr)]">
                      <aside className="border-b border-border bg-muted/35 p-4 sm:border-b-0 sm:border-r sm:p-5">
                        <div className="flex items-center gap-3 sm:block">
                          <div className="grid size-11 place-items-center rounded-full bg-emerald-soft text-xs font-bold text-emerald-ink sm:mb-3">
                            {post.initials}
                          </div>
                          <div>
                            <p className="font-heading text-sm font-bold">
                              {post.author}
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                              {post.authorRole}
                            </p>
                            <span className="mt-2 block">
                              <ContributionMark
                                score={
                                  contributionSummaries.get(post.authorId)
                                    ?.score || 0
                                }
                                label={
                                  contributionSummaries.get(post.authorId)
                                    ?.label || 'Новый вклад'
                                }
                              />
                            </span>
                          </div>
                        </div>
                        <dl className="mt-4 hidden space-y-2 text-[11px] sm:block">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Сообщений</dt>
                            <dd className="font-bold">
                              {index === 0 ? 284 : 96 + index * 17}
                            </dd>
                          </div>
                        </dl>
                      </aside>
                      <div className="min-w-0 p-4 sm:p-5">
                        <header className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-3 text-xs text-muted-foreground">
                          <span>{post.published}</span>
                          <span className="flex items-center gap-2">
                            <Link
                              href={`#post-${post.id}`}
                              className="font-semibold hover:text-foreground"
                            >
                              #{index + 1}
                            </Link>
                            <button
                              type="button"
                              aria-label="Действия с сообщением"
                              className="rounded-md p-1 hover:bg-muted"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          </span>
                        </header>
                        <div className="space-y-4 text-[15px] leading-7">
                          {post.body.map((paragraph, paragraphIndex) => (
                            <p key={`${post.id}-${paragraphIndex}`}>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                        <footer className="mt-6 flex items-center justify-between border-t border-border pt-4">
                          {topic.status === 'published' ? (
                            <ReactionBar
                              targetType={index === 0 ? 'topic' : 'post'}
                              targetId={index === 0 ? topic.id : post.id}
                              initialSummary={
                                reactionSummaries.get(
                                  reactionSummaryKey(
                                    index === 0 ? 'topic' : 'post',
                                    index === 0 ? topic.id : post.id,
                                  ),
                                ) || {
                                  counts: {
                                    helpful: 0,
                                    insightful: 0,
                                    thanks: 0,
                                  },
                                  myReaction: null,
                                }
                              }
                              ownTarget={post.authorId === user.id}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Реакции доступны после публикации
                            </span>
                          )}
                          <a
                            href="#reply"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                          >
                            <MessageCircleReply className="size-3.5" /> Ответить
                          </a>
                        </footer>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ol>

            <div id="reply">
              <ReplyComposer
                slug={topic.slug}
                disabledReason={disabledReason}
              />
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Тема
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Ответов</dt>
                  <dd className="font-bold">{topic.replies}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Просмотров</dt>
                  <dd className="font-bold">
                    {topic.views.toLocaleString('ru-RU')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Подписчиков</dt>
                  <dd className="font-bold">{topic.subscriberCount}</dd>
                </div>
              </dl>
            </section>
            {topic.moderationHistory.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  История модерации
                </p>
                <ol className="mt-4 space-y-4">
                  {topic.moderationHistory.map((action, index) => (
                    <li
                      key={`${action.action}-${action.created_at}-${index}`}
                      className="border-l-2 border-border pl-3 text-xs"
                    >
                      <strong className="block">
                        {actionLabels[action.action] || action.action}
                      </strong>
                      <span className="mt-1 block text-muted-foreground">
                        {action.actor} · {action.created}
                      </span>
                      {action.note && (
                        <span className="mt-1 block leading-5 text-muted-foreground">
                          {action.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-ink" />
                <h2 className="font-heading text-sm font-bold">
                  Культура обсуждения
                </h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Критикуйте решение, приводите контекст и первичные источники.
                Личные нападки и рекламный спам удаляются.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
