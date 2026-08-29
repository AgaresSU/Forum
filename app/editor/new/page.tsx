import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';

import { CommunityHeader } from '@/components/community-header';
import { EditorialEditor } from '@/components/editorial-editor';
import { buttonVariants } from '@/components/ui/button';
import { canUseEditorialWorkspace } from '@/lib/forum/editorial-workflow';
import { requireCommunityUser } from '@/lib/forum/require-community-user';

export const dynamic = 'force-dynamic';

export default async function NewEditorialMaterialPage() {
  const user = await requireCommunityUser();
  if (!canUseEditorialWorkspace(user.role)) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <CommunityHeader
          username={user.username}
          userId={user.id}
          role={user.role}
          active="editor"
        />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <LockKeyhole className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-5 font-heading text-3xl font-bold">
            Недостаточно прав
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Создавать редакционные материалы могут авторы, эксперты и команда
            форума.
          </p>
          <Link href="/forum" className={buttonVariants({ className: 'mt-6' })}>
            Вернуться на форум
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommunityHeader
        username={user.username}
        userId={user.id}
        role={user.role}
        active="editor"
      />
      <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8">
        <EditorialEditor />
      </main>
    </div>
  );
}
