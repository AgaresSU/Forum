import { AuthClient } from './auth-client';

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; reset?: string }>;
}) {
  const parameters = await searchParams;
  return <AuthClient initialMode={parameters.reset ? 'reset' : parameters.mode === 'login' ? 'login' : 'register'} initialResetToken={parameters.reset || ''} />;
}
