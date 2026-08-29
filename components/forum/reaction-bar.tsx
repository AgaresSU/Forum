'use client';

import { useState } from 'react';
import { HeartHandshake, Lightbulb, ThumbsUp } from 'lucide-react';

import type {
  ReactionSummary,
  ReactionTargetType,
  ReactionType,
} from '@/lib/forum/reactions';
import { cn } from '@/lib/utils';

const reactionOptions = [
  { type: 'helpful', label: 'Полезно', icon: ThumbsUp },
  { type: 'insightful', label: 'Содержательно', icon: Lightbulb },
  { type: 'thanks', label: 'Спасибо', icon: HeartHandshake },
] as const;

export function ReactionBar({
  targetType,
  targetId,
  initialSummary,
  ownTarget = false,
}: {
  targetType: ReactionTargetType;
  targetId: string;
  initialSummary: ReactionSummary;
  ownTarget?: boolean;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [pending, setPending] = useState<ReactionType | null>(null);
  const [message, setMessage] = useState('');

  async function react(reactionType: ReactionType) {
    if (ownTarget || pending) return;
    setPending(reactionType);
    setMessage('');
    try {
      const response = await fetch('/api/forum/reactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reactionType }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        summary?: ReactionSummary;
        message?: string;
      };
      if (!response.ok || !result.ok || !result.summary) {
        throw new Error(result.message || 'Не удалось сохранить реакцию');
      }
      setSummary(result.summary);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Не удалось сохранить реакцию',
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {reactionOptions.map(({ type, label, icon: Icon }) => {
        const selected = summary.myReaction === type;
        return (
          <button
            key={type}
            type="button"
            disabled={ownTarget || Boolean(pending)}
            aria-pressed={selected}
            title={ownTarget ? 'Нельзя оценивать собственный материал' : label}
            onClick={() => void react(type)}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold transition disabled:cursor-not-allowed',
              selected
                ? 'border-primary/25 bg-emerald-soft text-emerald-ink'
                : 'border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground',
              ownTarget && 'opacity-65',
            )}
          >
            <Icon className="size-3" />
            <span>{label}</span>
            {summary.counts[type] > 0 && (
              <span className="tabular-nums">{summary.counts[type]}</span>
            )}
          </button>
        );
      })}
      {message && (
        <span className="text-[10px] text-destructive" role="alert">
          {message}
        </span>
      )}
    </div>
  );
}

export function ContributionMark({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-emerald-soft px-2 py-0.5 text-[10px] font-bold text-emerald-ink"
      title="Вклад рассчитывается по содержательным реакциям других участников"
    >
      Вклад {score} · {label}
    </span>
  );
}
