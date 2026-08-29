import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EditorialContentPage } from '@/components/editorial-content-page';
import {
  getEditorialContent,
  getEditorialContentMetadata,
} from '@/lib/forum/content-repository';
import { decodeRouteValue } from '@/lib/forum/access';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const routeParams = await params;
  const record = await getEditorialContentMetadata(
    'article',
    decodeRouteValue(routeParams.slug),
  );
  if (!record) return {};
  return {
    title: `${record.title} — Журнал «Основы»`,
    description: record.summary,
    openGraph: {
      title: record.title,
      description: record.summary,
      images: [],
    },
    twitter: {
      title: record.title,
      description: record.summary,
      images: [],
    },
  };
}

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireCommunityUser();
  const routeParams = await params;
  const record = await getEditorialContent(
    'article',
    decodeRouteValue(routeParams.slug),
    user,
  );
  if (!record) notFound();
  return <EditorialContentPage record={record} user={user} />;
}
