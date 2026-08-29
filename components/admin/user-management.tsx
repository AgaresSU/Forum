'use client';

import { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

export type ManagedUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  verified: boolean;
  created: string;
  authored_count: number;
};

const roles = [
  ['member', 'Участник'],
  ['author', 'Автор'],
  ['expert', 'Эксперт'],
  ['pro', 'PRO'],
  ['partner', 'Партнёр'],
  ['moderator', 'Модератор'],
  ['admin', 'Администратор'],
] as const;

export function UserManagement({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>(
    Object.fromEntries(users.map((user) => [user.id, user.role])),
  );
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function changeRole(user: ManagedUser) {
    setPending(user.id);
    setMessage('');
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(user.id)}/role`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            role: selectedRoles[user.id],
            note: 'Изменено через административный интерфейс',
          }),
        },
      );
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok)
        throw new Error(result.message || 'Не удалось изменить роль');
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Не удалось изменить роль',
      );
      setPending(null);
    }
  }

  async function deleteUser(user: ManagedUser) {
    const note = window.prompt(
      `Причина удаления аккаунта ${user.username} (не менее 10 символов):`,
    );
    if (!note) return;
    setPending(user.id);
    setMessage('');
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(user.id)}`,
        {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ note }),
        },
      );
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok)
        throw new Error(result.message || 'Не удалось удалить аккаунт');
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Не удалось удалить аккаунт',
      );
      setPending(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-muted/45 px-5 py-4">
        <h2 className="font-heading font-bold">Пользователи и роли</h2>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {message || `${users.length} аккаунтов`}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-border text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Пользователь</th>
              <th className="px-4 py-3">Создан</th>
              <th className="px-4 py-3">Материалы</th>
              <th className="px-4 py-3">Роль</th>
              <th className="px-5 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => {
              const self = user.id === currentUserId;
              const changed = selectedRoles[user.id] !== user.role;
              return (
                <tr key={user.id}>
                  <td className="px-5 py-4">
                    <strong className="block font-heading">
                      {user.username}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {user.email} ·{' '}
                      {user.verified ? 'почта подтверждена' : 'не подтверждена'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {user.created}
                  </td>
                  <td className="px-4 py-4 tabular-nums">
                    {user.authored_count}
                  </td>
                  <td className="px-4 py-4">
                    <NativeSelect
                      value={selectedRoles[user.id]}
                      disabled={self || pending === user.id}
                      onChange={(event) =>
                        setSelectedRoles((current) => ({
                          ...current,
                          [user.id]: event.target.value,
                        }))
                      }
                    >
                      {roles.map(([value, label]) => (
                        <NativeSelectOption key={value} value={value}>
                          {label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={self || !changed || pending === user.id}
                        onClick={() => void changeRole(user)}
                      >
                        <Save /> Сохранить
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={
                          self || pending === user.id || user.authored_count > 0
                        }
                        onClick={() => void deleteUser(user)}
                      >
                        <Trash2 /> Удалить
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
