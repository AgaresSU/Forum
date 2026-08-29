'use client';

import { useState } from 'react';
import { BellOff, BellPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function SubscriptionButton({
  targetType,
  slug,
  initialSubscribed,
}: {
  targetType: 'forum' | 'topic';
  slug: string;
  initialSubscribed: boolean;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function toggle() {
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/forum/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetType, slug }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        subscribed?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok)
        throw new Error(result.message || 'Не удалось изменить подписку');
      setSubscribed(Boolean(result.subscribed));
      setMessage(
        result.subscribed ? 'Подписка включена' : 'Подписка отключена',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Не удалось изменить подписку',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={toggle}
      >
        {subscribed ? (
          <BellOff data-icon="inline-start" />
        ) : (
          <BellPlus data-icon="inline-start" />
        )}
        {pending ? 'Сохраняем…' : subscribed ? 'Отписаться' : 'Подписаться'}
      </Button>
      <span
        className="min-h-4 text-[10px] text-muted-foreground"
        aria-live="polite"
      >
        {message}
      </span>
    </span>
  );
}
