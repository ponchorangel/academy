export function safeErrorCode(error, fallback = 'internal_error') {
  const raw = error?.response?.data?.error || error?.code || fallback;
  return String(raw).replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 100) || fallback;
}

export function timingSafeEqualText(a, b) {
  const left = new TextEncoder().encode(String(a || ''));
  const right = new TextEncoder().encode(String(b || ''));
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value ?? '')));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
