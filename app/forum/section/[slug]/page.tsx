import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronRight,
  Eye,
  Lock,
  MessageCircle,
  Pin,
  Plus,
  ShieldCheck,
} from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import { SubscriptionButton } from '@/components/forum/subscription-button';
import { buttonVariants } from '@/components/ui/button';
import { canAccessRole } from '@/lib/forum/access';
import { requireCommunityUser } from '@/lib/forum/require-community-user';
import { getForumSubscription, listForumTopics } from '@/lib/forum/repository';
import { getForumBySlug } from '@/lib/forum/sample-content';

export const dynamic = 'force-dynamic';

export default async function ForumSectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireCommunityUser();
  const { slug } = await params;
  const found = getForumBySlug(slug);
  if (!found) notFound();

  const { section, forum } = found;
  const isLocked = !canAccessRole(user.role, forum.access);
  const [topics, subscription] = await Promise.all([
    listForumTopics(forum.slug, user),
    getForumSubscription(forum.slug, user),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active="forum"
      />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
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
          <span className="font-semibold text-foreground">{forum.title}</span>
        </nav>

        <header className="mb-6 flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">
                {section.title}
              </p>
              {forum.access === 'pro' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-2 py-0.5 text-[9px] font-bold text-violet-ink">
                  <Lock className="size-2.5" /> PRO
                </span>
              )}
            </div>
            <h1 className="mt-2 font-heading text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
              {forum.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {forum.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {forum.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {!isLocked && (
              <SubscriptionButton
                targetType="forum"
                slug={forum.slug}
                initialSubscribed={subscription.subscribed}
              />
            )}
            {!isLocked && (
              <Link
                href={`/forum?compose=1&forum=${forum.slug}`}
                className={buttonVariants({ className: 'h-9' })}
              >
                <Plus data-icon="inline-start" /> Новая тема
              </Link>
            )}
          </div>
        </header>

        {isLocked ? (
          <section className="rounded-2xl border border-violet-ink/15 bg-violet-soft px-6 py-14 text-center text-violet-ink">
            <Lock className="mx-auto size-7" />
            <h2 className="mt-4 font-heading text-xl font-bold">
              Раздел доступен участникам PRO
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 opacity-80">
              Заголовки раздела видны в структуре форума, но материалы и
              обсуждения открываются согласно роли пользователя.
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
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid grid-cols-[minmax(0,1fr)_100px] border-b border-border bg-muted/45 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:px-5">
                <span>Обсуждения</span>
                <span className="text-right">Активность</span>
              </div>
              {topics.map((topic) => (
                <article
                  key={topic.slug}
                  className="grid grid-cols-[minmax(0,1fr)_76px] gap-3 border-t border-border px-4 py-4 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_110px] sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {topic.pinned && (
                        <Pin className="size-3.5 fill-current text-amber-ink" />
                      )}
                      <Link
                        href={`/forum/topic/${topic.slug}`}
                        className="font-heading font-bold tracking-[-0.01em] transition hover:text-primary"
                      >
                        {topic.title}
                      </Link>
                      {topic.commercial && (
                        <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[9px] font-bold uppercase text-amber-ink">
                          Реклама
                        </span>
                      )}
                      {topic.status === 'pending' && (
                        <span className="rounded-full bg-violet-soft px-2 py-0.5 text-[9px] font-bold uppercase text-violet-ink">
                          На проверке
                        </span>
                      )}
                      {topic.status === 'rejected' && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-bold uppercase text-destructive">
                          Отклонено
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-muted-foreground">
                      {topic.excerpt}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/75">
                        {topic.author}
                      </span>{' '}
                      · {topic.authorRole}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3" /> {topic.replies}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1">
                      <Eye className="size-3" />{' '}
                      {topic.views.toLocaleString('ru-RU')}
                    </p>
                    <p className="mt-2 hidden text-[11px] sm:block">
                      {topic.updated}
                    </p>
                  </div>
                </article>
              ))}
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-border bg-card p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Статистика раздела
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Тем</dt>
                    <dd className="font-bold">
                      {forum.topics.toLocaleString('ru-RU')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Сообщений</dt>
                    <dd className="font-bold">
                      {forum.posts.toLocaleString('ru-RU')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Подписчиков</dt>
                    <dd className="font-bold">{subscription.count}</dd>
                  </div>
                </dl>
              </section>
              {(section.slug === 'income' || section.slug === 'promotion') && (
                <section className="rounded-2xl border border-amber-ink/15 bg-amber-soft p-5 text-amber-ink">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4" />
                    <h2 className="font-heading text-sm font-bold">
                      Премодерация раздела
                    </h2>
                  </div>
                  <p className="mt-2 text-xs leading-5 opacity-80">
                    Кейсы должны раскрывать риски и заинтересованность автора.
                    Реклама и реферальные ссылки маркируются.
                  </p>
                </section>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
