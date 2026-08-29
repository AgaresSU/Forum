'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  MailCheck,
  MessageCircle,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type Mode = 'register' | 'login' | 'verify' | 'forgot' | 'reset' | 'twoFactor';
type ApiResult = {
  ok: boolean;
  message?: string;
  code?: string;
  email?: string;
  devCode?: string;
  devToken?: string;
  requiresTwoFactor?: boolean;
  challengeId?: string;
  methods?: Array<'totp' | 'telegram'>;
  next?: string;
};

async function requestJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as ApiResult;
  if (!response.ok || !result.ok) throw Object.assign(new Error(result.message || 'Что-то пошло не так'), { result });
  return result;
}

function formString(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

export function AuthClient({ initialMode, initialResetToken }: { initialMode: Mode; initialResetToken: string }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [challengeId, setChallengeId] = useState('');
  const [twoFactorMethods, setTwoFactorMethods] = useState<Array<'totp' | 'telegram'>>([]);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'telegram'>('totp');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  function switchMode(nextMode: Mode) {
    setMessage(null);
    setMode(nextMode);
  }

  async function submit(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      const result = (error as Error & { result?: ApiResult }).result;
      if (result?.code === 'EMAIL_NOT_VERIFIED' && result.email) {
        setEmail(result.email);
        setMode('verify');
        setMessage({ kind: 'error', text: result.message || 'Сначала подтвердите почту' });
      } else {
        setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Не удалось выполнить запрос' });
      }
    } finally {
      setBusy(false);
    }
  }

  async function onRegister(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit(async () => {
      const result = await requestJson('/api/auth/register', {
        email: formString(form, 'email'),
        username: formString(form, 'username'),
        password: formString(form, 'password'),
        passwordConfirmation: formString(form, 'passwordConfirmation'),
      });
      setEmail(formString(form, 'email'));
      setVerificationCode(result.devCode || '');
      setMode('verify');
      setMessage({
        kind: 'success',
        text: result.devCode ? `Локальный код подтверждения: ${result.devCode}` : 'Код отправлен на почту',
      });
    });
  }

  async function onVerify(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      const result = await requestJson('/api/auth/verify-email', { email, code: verificationCode });
      window.location.assign(result.next || '/forum');
    });
  }

  async function resendVerification() {
    await submit(async () => {
      const result = await requestJson('/api/auth/verification/resend', { email });
      if (result.devCode) setVerificationCode(result.devCode);
      setMessage({ kind: 'success', text: result.devCode ? `Новый локальный код: ${result.devCode}` : 'Новый код отправлен' });
    });
  }

  async function onLogin(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit(async () => {
      const result = await requestJson('/api/auth/login', { login: formString(form, 'login'), password: formString(form, 'password') });
      if (result.requiresTwoFactor && result.challengeId && result.methods?.length) {
        setChallengeId(result.challengeId);
        setTwoFactorMethods(result.methods);
        setTwoFactorMethod(result.methods[0]);
        setMode('twoFactor');
        return;
      }
      window.location.assign('/forum');
    });
  }

  async function onForgot(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit(async () => {
      const result = await requestJson('/api/auth/password/request', { email: formString(form, 'email') });
      if (result.devToken) {
        setResetToken(result.devToken);
        setMode('reset');
        setMessage({ kind: 'success', text: 'Локальная ссылка создана. Задайте новый пароль.' });
      } else {
        setMessage({ kind: 'success', text: 'Если аккаунт существует, ссылка отправлена на почту.' });
      }
    });
  }

  async function onReset(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit(async () => {
      const result = await requestJson('/api/auth/password/reset', {
        token: resetToken,
        password: formString(form, 'password'),
        passwordConfirmation: formString(form, 'passwordConfirmation'),
      });
      window.location.assign(result.next || '/forum');
    });
  }

  async function sendTelegramCode() {
    await submit(async () => {
      const result = await requestJson('/api/auth/2fa/telegram/send', { challengeId });
      if (result.devCode) setTwoFactorCode(result.devCode);
      setMessage({ kind: 'success', text: result.devCode ? `Локальный Telegram-код: ${result.devCode}` : 'Код отправлен ботом' });
    });
  }

  async function onTwoFactor(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      const result = await requestJson('/api/auth/2fa/verify', { challengeId, method: twoFactorMethod, code: twoFactorCode });
      window.location.assign(result.next || '/forum');
    });
  }

  const titles: Record<Mode, { title: string; text: string }> = {
    register: { title: 'Регистрация', text: 'Создайте профиль участника' },
    login: { title: 'Вход', text: 'Почта или юзернейм' },
    verify: { title: 'Подтверждение почты', text: email || 'Введите код из письма' },
    forgot: { title: 'Сброс пароля', text: 'Отправим одноразовую ссылку' },
    reset: { title: 'Новый пароль', text: 'Старые сессии будут закрыты' },
    twoFactor: { title: 'Двухфакторная проверка', text: 'Подтвердите, что это вы' },
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="size-4" /> Вернуться к форуму
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
          <section className="max-w-xl pt-2 lg:pt-8">
            <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-emerald-soft text-emerald-ink">
              <ShieldCheck className="size-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-strong">Аккаунт «Основы»</p>
            <h1 className="mt-3 font-heading text-4xl font-bold tracking-[-0.045em] sm:text-5xl">Один профиль для всех разделов</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
              Почта подтверждается до первой публикации. Затем можно включить Google Authenticator или получать одноразовый код от Telegram-бота.
            </p>
            <ol className="mt-8 space-y-4 text-sm">
              {[
                { icon: KeyRound, title: 'Аккаунт', text: 'Почта, уникальный юзернейм и стойкий пароль.' },
                { icon: MailCheck, title: 'Проверка почты', text: 'Одноразовый код действует 15 минут.' },
                { icon: Smartphone, title: 'Дополнительная защита', text: 'TOTP-приложение или Telegram-бот.' },
              ].map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-primary"><Icon className="size-4" /></span>
                  <span><strong className="block font-heading">{index + 1}. {title}</strong><span className="mt-0.5 block text-muted-foreground">{text}</span></span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-[0_28px_80px_-55px_rgb(20_39_32/70%)] sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl font-bold tracking-[-0.03em]">{titles[mode].title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{titles[mode].text}</p>
              </div>
              {(mode === 'register' || mode === 'login') && (
                <button type="button" onClick={() => switchMode(mode === 'register' ? 'login' : 'register')} className="text-sm font-bold text-primary hover:underline">
                  {mode === 'register' ? 'Войти' : 'Регистрация'}
                </button>
              )}
            </div>

            {message && (
              <Alert variant={message.kind === 'error' ? 'destructive' : 'default'} className={`mb-5 ${message.kind === 'success' ? 'border-emerald-ink/20 bg-emerald-soft text-emerald-ink' : ''}`}>
                <AlertTitle>{message.kind === 'error' ? 'Проверьте данные' : 'Готово'}</AlertTitle>
                <AlertDescription className={message.kind === 'success' ? 'text-emerald-ink/80' : ''}>{message.text}</AlertDescription>
              </Alert>
            )}

            {mode === 'register' && (
              <form onSubmit={onRegister}>
                <FieldGroup>
                  <Field><FieldLabel htmlFor="register-email">Почта</FieldLabel><Input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-11" required /></Field>
                  <Field><FieldLabel htmlFor="register-username">Юзернейм</FieldLabel><Input id="register-username" name="username" autoComplete="username" placeholder="например, pro_user" className="h-11" required /><FieldDescription>3–24 символа: латиница, цифры и подчёркивание.</FieldDescription></Field>
                  <Field><FieldLabel htmlFor="register-password">Пароль</FieldLabel><div className="relative"><Input id="register-password" name="password" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" placeholder="Не менее 10 символов" className="h-11 pr-10" required /><button type="button" onClick={() => setShowPasswords((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Показать пароль">{showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></Field>
                  <Field><FieldLabel htmlFor="register-confirmation">Подтверждение пароля</FieldLabel><Input id="register-confirmation" name="passwordConfirmation" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" placeholder="Повторите пароль" className="h-11" required /></Field>
                </FieldGroup>
                <Button disabled={busy} type="submit" size="lg" className="mt-6 h-11 w-full">{busy && <LoaderCircle className="animate-spin" />} Создать аккаунт</Button>
              </form>
            )}

            {mode === 'login' && (
              <form onSubmit={onLogin}>
                <FieldGroup>
                  <Field><FieldLabel htmlFor="login">Почта или юзернейм</FieldLabel><Input id="login" name="login" autoComplete="username" className="h-11" required /></Field>
                  <Field><div className="flex justify-between"><FieldLabel htmlFor="login-password">Пароль</FieldLabel><button type="button" onClick={() => switchMode('forgot')} className="text-xs font-semibold text-primary hover:underline">Забыли пароль?</button></div><Input id="login-password" name="password" type="password" autoComplete="current-password" className="h-11" required /></Field>
                </FieldGroup>
                <Button disabled={busy} type="submit" size="lg" className="mt-6 h-11 w-full">{busy && <LoaderCircle className="animate-spin" />} Войти</Button>
              </form>
            )}

            {mode === 'verify' && (
              <form onSubmit={onVerify}>
                <Field><FieldLabel htmlFor="verification-code">Код из письма</FieldLabel><Input id="verification-code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/gu, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="h-14 text-center font-mono text-2xl tracking-[0.35em]" required /></Field>
                <Button disabled={busy || verificationCode.length !== 6} type="submit" size="lg" className="mt-6 h-11 w-full">Подтвердить почту</Button>
                <div className="mt-4 flex justify-between text-xs"><button type="button" onClick={resendVerification} className="font-semibold text-primary hover:underline">Отправить новый код</button><button type="button" onClick={() => switchMode('login')} className="text-muted-foreground hover:text-foreground">Ко входу</button></div>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={onForgot}>
                <Field><FieldLabel htmlFor="forgot-email">Почта аккаунта</FieldLabel><Input id="forgot-email" name="email" type="email" autoComplete="email" className="h-11" required /><FieldDescription>Ссылка действует 30 минут.</FieldDescription></Field>
                <Button disabled={busy} type="submit" size="lg" className="mt-6 h-11 w-full">Создать ссылку сброса</Button>
                <button type="button" onClick={() => switchMode('login')} className="mt-4 w-full text-xs font-semibold text-muted-foreground hover:text-foreground">Вернуться ко входу</button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={onReset}>
                <FieldGroup>
                  {!resetToken && <Field><FieldLabel htmlFor="reset-token">Токен из письма</FieldLabel><Input id="reset-token" value={resetToken} onChange={(event) => setResetToken(event.target.value)} className="h-11" required /></Field>}
                  <Field><FieldLabel htmlFor="reset-password">Новый пароль</FieldLabel><Input id="reset-password" name="password" type="password" autoComplete="new-password" className="h-11" required /></Field>
                  <Field><FieldLabel htmlFor="reset-confirmation">Повторите пароль</FieldLabel><Input id="reset-confirmation" name="passwordConfirmation" type="password" autoComplete="new-password" className="h-11" required /></Field>
                </FieldGroup>
                <Button disabled={busy} type="submit" size="lg" className="mt-6 h-11 w-full">Сохранить новый пароль</Button>
              </form>
            )}

            {mode === 'twoFactor' && (
              <form onSubmit={onTwoFactor}>
                {twoFactorMethods.length > 1 && (
                  <div className="mb-5 grid grid-cols-2 gap-2">
                    {twoFactorMethods.map((method) => (
                      <button key={method} type="button" onClick={() => { setTwoFactorMethod(method); setTwoFactorCode(''); setMessage(null); }} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${twoFactorMethod === method ? 'border-primary bg-emerald-soft text-primary' : 'border-border'}`}>
                        {method === 'totp' ? 'Authenticator' : 'Telegram'}
                      </button>
                    ))}
                  </div>
                )}
                {twoFactorMethod === 'telegram' && <Button type="button" variant="outline" onClick={sendTelegramCode} className="mb-4 w-full"><MessageCircle /> Получить код в Telegram</Button>}
                <Field><FieldLabel htmlFor="two-factor-code">Одноразовый код</FieldLabel><Input id="two-factor-code" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/gu, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="h-14 text-center font-mono text-2xl tracking-[0.35em]" required /></Field>
                <Button disabled={busy || twoFactorCode.length !== 6} type="submit" size="lg" className="mt-6 h-11 w-full">Подтвердить вход</Button>
              </form>
            )}

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Check className="size-3.5 text-emerald-ink" /> Пароль не отправляется по почте или в Telegram
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
