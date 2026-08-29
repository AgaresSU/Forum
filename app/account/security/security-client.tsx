'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, Copy, KeyRound, LoaderCircle, LogOut, MessageCircle, ShieldCheck, Smartphone } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type PublicUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  telegramEnabled: boolean;
  telegramUsername: string | null;
};

type SetupResult = { ok: boolean; message?: string; secret?: string; qrDataUrl?: string; mode?: 'bot' | 'local'; botUrl?: string | null; devCode?: string };

async function post(path: string, body: Record<string, unknown> = {}) {
  const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const result = (await response.json()) as SetupResult;
  if (!response.ok || !result.ok) throw new Error(result.message || 'Не удалось выполнить действие');
  return result;
}

export function SecurityClient({ initialUser }: { initialUser: PublicUser }) {
  const [user, setUser] = useState(initialUser);
  const [busy, setBusy] = useState<'totp' | 'telegram' | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [telegramSetup, setTelegramSetup] = useState<{ botUrl: string | null; code: string } | null>(null);
  const [telegramCode, setTelegramCode] = useState('');

  async function run(kind: 'totp' | 'telegram', action: () => Promise<void>) {
    setBusy(kind);
    setNotice(null);
    try { await action(); } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Не удалось выполнить действие' }); } finally { setBusy(null); }
  }

  async function startTotp() {
    await run('totp', async () => {
      const result = await post('/api/auth/2fa/totp/setup');
      if (result.secret && result.qrDataUrl) setTotpSetup({ secret: result.secret, qrDataUrl: result.qrDataUrl });
    });
  }

  async function confirmTotp() {
    await run('totp', async () => {
      await post('/api/auth/2fa/totp/confirm', { code: totpCode });
      setUser((current) => ({ ...current, totpEnabled: true }));
      setTotpSetup(null);
      setNotice({ kind: 'success', text: 'Google Authenticator подключён.' });
    });
  }

  async function startTelegram() {
    await run('telegram', async () => {
      const result = await post('/api/auth/2fa/telegram/setup');
      const code = result.devCode || '';
      setTelegramSetup({ botUrl: result.botUrl || null, code });
      setTelegramCode(code);
    });
  }

  async function confirmTelegram() {
    await run('telegram', async () => {
      await post('/api/auth/2fa/telegram/confirm', { code: telegramCode });
      setUser((current) => ({ ...current, telegramEnabled: true, telegramUsername: 'local_test_bot' }));
      setTelegramSetup(null);
      setNotice({ kind: 'success', text: 'Telegram-бот подключён в локальном режиме.' });
    });
  }

  async function logout() {
    await post('/api/auth/logout');
    window.location.assign('/auth?mode=login');
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" /> Вернуться к форуму</Link>
          <Button variant="outline" onClick={logout}><LogOut /> Выйти</Button>
        </header>

        <section className="mt-9 max-w-3xl">
          <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-emerald-soft text-emerald-ink"><ShieldCheck className="size-5" /></div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-strong">Безопасность аккаунта</p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Защита профиля @{user.username}</h1>
          <p className="mt-3 text-muted-foreground">{user.email} · почта подтверждена</p>
        </section>

        {notice && <Alert variant={notice.kind === 'error' ? 'destructive' : 'default'} className={`mt-6 ${notice.kind === 'success' ? 'border-emerald-ink/20 bg-emerald-soft text-emerald-ink' : ''}`}><AlertTitle>{notice.kind === 'error' ? 'Ошибка' : 'Готово'}</AlertTitle><AlertDescription>{notice.text}</AlertDescription></Alert>}

        <section className="mt-7 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-[0_20px_60px_-50px_rgb(20_39_32/60%)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-10 place-items-center rounded-xl bg-violet-soft text-violet-ink"><Smartphone className="size-4" /></div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${user.totpEnabled ? 'bg-emerald-soft text-emerald-ink' : 'bg-muted text-muted-foreground'}`}>{user.totpEnabled ? 'Подключено' : 'Не настроено'}</span>
            </div>
            <h2 className="mt-5 font-heading text-xl font-bold">Google Authenticator</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Код меняется каждые 30 секунд и работает без сети.</p>

            {!user.totpEnabled && !totpSetup && <Button disabled={busy === 'totp'} onClick={startTotp} className="mt-5 w-full">{busy === 'totp' && <LoaderCircle className="animate-spin" />} Настроить TOTP</Button>}
            {totpSetup && (
              <div className="mt-5 rounded-2xl border border-border bg-background p-4">
                <Image src={totpSetup.qrDataUrl} alt="QR-код для Google Authenticator" width={208} height={208} unoptimized className="mx-auto size-52 rounded-xl bg-white p-2" />
                <Field className="mt-4"><FieldLabel htmlFor="totp-secret">Ключ вручную</FieldLabel><div className="flex gap-2"><Input id="totp-secret" readOnly value={totpSetup.secret} className="font-mono text-xs" /><Button type="button" variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(totpSetup.secret)} aria-label="Скопировать ключ"><Copy /></Button></div></Field>
                <Field className="mt-4"><FieldLabel htmlFor="totp-code">Код из приложения</FieldLabel><Input id="totp-code" value={totpCode} onChange={(event) => setTotpCode(event.target.value.replace(/\D/gu, '').slice(0, 6))} inputMode="numeric" placeholder="000000" className="h-11 text-center font-mono tracking-[0.3em]" /></Field>
                <Button disabled={busy === 'totp' || totpCode.length !== 6} onClick={confirmTotp} className="mt-4 w-full">Подтвердить подключение</Button>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-[0_20px_60px_-50px_rgb(20_39_32/60%)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-700"><MessageCircle className="size-4" /></div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${user.telegramEnabled ? 'bg-emerald-soft text-emerald-ink' : 'bg-muted text-muted-foreground'}`}>{user.telegramEnabled ? 'Подключено' : 'Не настроено'}</span>
            </div>
            <h2 className="mt-5 font-heading text-xl font-bold">Telegram-бот</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Бот присылает отдельный одноразовый код при входе.</p>

            {!user.telegramEnabled && !telegramSetup && <Button disabled={busy === 'telegram'} onClick={startTelegram} className="mt-5 w-full">{busy === 'telegram' && <LoaderCircle className="animate-spin" />} Подключить Telegram</Button>}
            {telegramSetup && (
              <div className="mt-5 rounded-2xl border border-border bg-background p-4">
                {telegramSetup.botUrl ? (
                  <a href={telegramSetup.botUrl} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-bold text-white">Открыть бота</a>
                ) : (
                  <Alert className="border-amber-ink/20 bg-amber-soft text-amber-ink"><KeyRound /><AlertTitle>Локальный режим</AlertTitle><AlertDescription>Токен бота не задан, поэтому код показан здесь.</AlertDescription></Alert>
                )}
                <Field className="mt-4"><FieldLabel htmlFor="telegram-link-code">Код привязки</FieldLabel><Input id="telegram-link-code" value={telegramCode} onChange={(event) => setTelegramCode(event.target.value.replace(/\D/gu, '').slice(0, 8))} inputMode="numeric" className="h-11 text-center font-mono tracking-[0.25em]" /><FieldDescription>В реальном боте этот код передаётся командой /start.</FieldDescription></Field>
                <Button disabled={busy === 'telegram' || telegramCode.length !== 8} onClick={confirmTelegram} className="mt-4 w-full">Подтвердить привязку</Button>
              </div>
            )}
          </article>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-soft text-emerald-ink"><Check className="size-4" /></div><div><h2 className="font-heading font-bold">Пароли и секреты защищены</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">Пароль хранится как PBKDF2-хеш. Секрет TOTP зашифрован, коды подтверждения одноразовые, а сессионная cookie недоступна JavaScript.</p></div></div>
        </section>
      </div>
    </main>
  );
}
