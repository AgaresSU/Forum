import * as OTPAuth from 'otpauth';

const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return base64ToBytes(padded);
}

function randomBytes(length: number) {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function randomToken(bytes = 32) {
  return bytesToBase64Url(randomBytes(bytes));
}

export function numericCode(length = 6) {
  const maximum = 10 ** length;
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % maximum;
  return value.toString().padStart(length, '0');
}

export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function hashPassword(password: string) {
  const iterations = 210_000;
  const salt = randomBytes(16);
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    256,
  );
  return `pbkdf2_sha256$${iterations}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, iterationsValue, saltValue, hashValue] = stored.split('$');
  if (algorithm !== 'pbkdf2_sha256' || !iterationsValue || !saltValue || !hashValue) return false;
  const iterations = Number(iterationsValue);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000) return false;
  const salt = base64UrlToBytes(saltValue);
  const expected = base64UrlToBytes(hashValue);
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    expected.length * 8,
  );
  return constantTimeEqual(new Uint8Array(bits), expected);
}

function authSecret() {
  return process.env.AUTH_SECRET || 'osnova-local-development-secret-change-before-production';
}

async function encryptionKey() {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(authSecret()));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(), encoder.encode(secret));
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(value: string) {
  const [version, ivValue, cipherValue] = value.split('.');
  if (version !== 'v1' || !ivValue || !cipherValue) throw new Error('Invalid encrypted secret');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64UrlToBytes(ivValue) },
    await encryptionKey(),
    base64UrlToBytes(cipherValue),
  );
  return new TextDecoder().decode(decrypted);
}

export function generateTotpSecret() {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function totp(secret: string, label = 'account') {
  return new OTPAuth.TOTP({
    issuer: 'Основа',
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export function totpUri(secret: string, label: string) {
  return totp(secret, label).toString();
}

export async function verifyTotp(secret: string, code: string, now = Date.now()) {
  return totp(secret).validate({ token: code.replaceAll(' ', ''), window: 1, timestamp: now }) !== null;
}
