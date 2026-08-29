export async function sendAuthEmail(input: {
  to: string;
  kind: 'verify_email' | 'password_reset';
  code?: string;
  resetUrl?: string;
}) {
  const endpoint = process.env.AUTH_EMAIL_WEBHOOK_URL;
  const bearerToken = process.env.AUTH_EMAIL_WEBHOOK_TOKEN;
  if (!endpoint) return { delivered: false as const };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(bearerToken ? { authorization: `Bearer ${bearerToken}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Email delivery failed');
  return { delivered: true as const };
}
