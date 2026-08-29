import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  FileText,
  Lock,
  MessageSquareText,
  Search,
} from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { searchCommunity, type CommunitySearchType } from '@/lib/forum/search';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

const kindLabels = {
  forum: 'Форум',
  journal: 'Журнал',
  library: 'База знаний',
};

const kindIcons = {
  forum: MessageSquareText,
  journal: FileText,
  library: BookOpen,
};

function validType(value?: string): CommunitySearchType {
  return value === 'forum' || value === 'journal' || value === 'library'
    ? value
    : 'all';
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const user = await requireCommunityUser();
  const params = await searchParams;
  const query = (params.q || '').trim().slice(0, 100);
  const type = validType(params.type);
  const results = await searchCommunity(user, query, type);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active="search"
      />
      <main className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-strong">
            По всему сообществу
          </p>
          <h1 className="mt-2 font-heading text-4xl font-bold tracking-[-0.045em]">
            Единый поиск
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Темы, ответы, статьи и мануалы. Закрытый текст PRO никогда не входит
            в результаты участника без доступа.
          </p>
          <form
            action="/search"
            className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px_auto]"
          >
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <span className="sr-only">Поисковый запрос</span>
              <input
                name="q"
                defaultValue={query}
                minLength={2}
                maxLength={100}
                placeholder="Например: утечка соединений Go"
                className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <NativeSelect className="w-full" name="type" defaultValue={type}>
              <NativeSelectOption value="all">Везде</NativeSelectOption>
              <NativeSelectOption value="forum">Форум</NativeSelectOption>
              <NativeSelectOption value="journal">Журнал</NativeSelectOption>
              <NativeSelectOption value="library">
                База знаний
              </NativeSelectOption>
            </NativeSelect>
            <button
              type="submit"
              className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-primary/85"
            >
              Найти
            </button>
          </form>
        </header>

        {query.length < 2 ? (
          <section className="py-20 text-center">
            <Search className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-4 font-heading text-xl font-bold">
              Введите хотя бы два символа
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Поиск понимает несколько слов и проверяет заголовки, описания и
              доступный вам текст.
            </p>
          </section>
        ) : results.length ? (
          <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            <header className="flex items-center justify-between border-b border-border bg-muted/45 px-5 py-4">
              <h2 className="font-heading font-bold">Результаты «{query}»</h2>
              <span className="text-xs font-semibold text-muted-foreground">
                {results.length}
              </span>
            </header>
            {results.map((result) => {
              const Icon = kindIcons[result.kind];
              return (
                <article
                  key={`${result.kind}:${result.id}`}
                  className="grid gap-4 border-t border-border px-5 py-5 first:border-t-0 sm:grid-cols-[40px_minmax(0,1fr)_32px] sm:items-center"
                >
                  <div className="grid size-10 place-items-center rounded-xl bg-emerald-soft text-emerald-ink">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={result.href}
                        className="font-heading font-bold hover:text-primary"
                      >
                        {result.title}
                      </Link>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        {kindLabels[result.kind]}
                      </span>
                      {result.access === 'pro' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-soft px-2 py-0.5 text-[9px] font-bold text-violet-ink">
                          <Lock className="size-2.5" /> PRO
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {result.summary}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {result.author} · обновлено {result.updated}
                      {result.locked ? ' · полный текст закрыт' : ''}
                    </p>
                  </div>
                  <Link
                    href={result.href}
                    aria-label={`Открыть ${result.title}`}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary"
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="py-20 text-center">
            <Search className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-4 font-heading text-xl font-bold">
              Ничего не найдено
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Попробуйте сократить запрос, изменить форму слова или выбрать все
              типы материалов.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
