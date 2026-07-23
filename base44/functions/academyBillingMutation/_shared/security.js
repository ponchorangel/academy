export function safeErrorCode(error, fallback = 'internal_error') {
  const raw = error?.response?.data?.error || error?.code || fallback;
  return String(raw).replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 100) || fallback;
}

export function safeText(value, maxLength = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

export function emailIsValid(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/[\r\n]/.test(email);
}
