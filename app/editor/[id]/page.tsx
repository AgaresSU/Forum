import { notFound } from 'next/navigation';

import { CommunityHeader } from '@/components/community-header';
import {
  EditorialEditor,
  type EditorialWorkspaceRecord,
} from '@/components/editorial-editor';
import { decodeRouteValue } from '@/lib/forum/access';
import { getEditorialWorkspaceRecord } from '@/lib/forum/editorial-workflow';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

export default async function EditorialMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCommunityUser();
  const { id } = await params;
  const record = await getEditorialWorkspaceRecord(user, decodeRouteValue(id));
  if (!record) notFound();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active="editor"
      />
      <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8">
        <EditorialEditor record={record as EditorialWorkspaceRecord} />
      </main>
    </div>
  );
}
