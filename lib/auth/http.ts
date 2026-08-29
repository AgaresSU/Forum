import { z, type ZodError } from 'zod';

export function json(data: unknown, init?: number | ResponseInit) {
  const options = typeof init === 'number' ? { status: init } : init;
  const headers = new Headers(options?.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { ...options, headers });
}

export function validationError(error: ZodError) {
  return json(
    {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: error.issues[0]?.message || 'Проверьте заполнение полей',
      fields: z.flattenError(error).fieldErrors,
    },
    400,
  );
}

export function isLocalDevelopment() {
  return process.env.NODE_ENV !== 'production';
}
