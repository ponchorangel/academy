// Validacion de archivos remotos con proteccion SSRF. Copiado del patron
// probado en domina-tus-impuestos. Ajusta FILE_TYPES a los formatos que esta
// app realmente necesita aceptar -- no dejes tipos que no uses.
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const MAX_REDIRECTS = 3;

export const FILE_TYPES = Object.freeze({
  'application/pdf': Object.freeze({ extensions: ['.pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] }),
  'image/png': Object.freeze({ extensions: ['.png'], magic: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] }),
  'image/jpeg': Object.freeze({ extensions: ['.jpg', '.jpeg'], magic: [[0xff, 0xd8, 0xff]] }),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': Object.freeze({ extensions: ['.xlsx'], magic: [[0x50, 0x4b, 0x03, 0x04]] }),
  'application/vnd.ms-excel': Object.freeze({ extensions: ['.xls'], magic: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]] }),
});

function normalizeHost(hostname) {
  return String(hostname || '').trim().toLowerCase().replace(/\.$/, '');
}

function parseIpv4(hostname) {
  const h = normalizeHost(hostname);
  const dotted = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (dotted) {
    const octets = dotted.slice(1).map(Number);
    return octets.every(n => n >= 0 && n <= 255) ? octets : null;
  }
  if (/^0x[0-9a-f]+$/i.test(h)) {
    const value = Number.parseInt(h.slice(2), 16);
    if (value >= 0 && value <= 0xffffffff) return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
  }
  if (/^\d+$/.test(h)) {
    const value = Number(h);
    if (Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff) return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
  }
  return null;
}

export function isPrivateAddress(hostname) {
  const h = normalizeHost(hostname).replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h === 'metadata.google.internal') return true;
  const ipv4 = parseIpv4(h);
  if (ipv4) {
    const [a, b] = ipv4;
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) || (a === 192 && b === 168) || a >= 224;
  }
  if (h.includes(':')) {
    const compact = h.toLowerCase();
    return compact === '::' || compact === '::1' || compact.startsWith('fc') || compact.startsWith('fd') ||
      compact.startsWith('fe8') || compact.startsWith('fe9') || compact.startsWith('fea') || compact.startsWith('feb') ||
      compact.startsWith('ff') || compact.includes('::ffff:127.') || compact.includes('::ffff:10.') || compact.includes('::ffff:169.254.') || compact.includes('::ffff:192.168.');
  }
  return false;
}

export function parseAllowedOrigins(raw) {
  return String(raw || '').split(',').map(item => item.trim()).filter(Boolean).map(item => {
    let parsed;
    try { parsed = new URL(item); } catch { throw new Error('invalid_file_allowlist'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash || (parsed.port && parsed.port !== '443') || isPrivateAddress(parsed.hostname)) {
      throw new Error('invalid_file_allowlist');
    }
    const pathPrefix = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '') + '/';
    return Object.freeze({ origin: parsed.origin.toLowerCase(), hostname: normalizeHost(parsed.hostname), pathPrefix });
  });
}

export function validateAllowedLocation(value, rawAllowlist) {
  const allowlist = parseAllowedOrigins(rawAllowlist);
  if (allowlist.length === 0) return { ok: false, error: 'file_allowlist_not_configured' };
  let url;
  try { url = new URL(String(value || '')); } catch { return { ok: false, error: 'invalid_file_url' }; }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443') || isPrivateAddress(url.hostname)) {
    return { ok: false, error: 'invalid_file_url' };
  }
  const match = allowlist.find(entry => url.origin.toLowerCase() === entry.origin && (entry.pathPrefix === '/' || url.pathname.startsWith(entry.pathPrefix)));
  return match ? { ok: true, url } : { ok: false, error: 'file_origin_not_allowed' };
}

export function sanitizeFilename(value) {
  const normalized = String(value || '').normalize('NFKC').replace(/[\\/\u0000-\u001f\u007f]+/g, '_').replace(/^\.+/, '').trim();
  return normalized.slice(0, 180) || 'archivo';
}

export function validateFileReference(input, options = {}) {
  const location = validateAllowedLocation(input.url, options.allowedOrigins);
  if (!location.ok) return location;
  const url = location.url;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname).toLowerCase(); } catch { return { ok: false, error: 'invalid_file_path' }; }
  if (pathname.includes('/../') || pathname.endsWith('/..')) return { ok: false, error: 'invalid_file_path' };
  const claimedMime = String(input.mime || '').toLowerCase().split(';')[0].trim();
  const type = FILE_TYPES[claimedMime];
  if (!type || (options.allowedMimes && !options.allowedMimes.includes(claimedMime))) return { ok: false, error: 'file_type_not_allowed' };
  if (!type.extensions.some(ext => pathname.endsWith(ext))) return { ok: false, error: 'file_extension_mismatch' };
  const size = Number(input.size);
  const maxBytes = Number(options.maxBytes || DEFAULT_MAX_BYTES);
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxBytes) return { ok: false, error: 'invalid_file_size' };
  return { ok: true, url, mime: claimedMime, size, filename: sanitizeFilename(input.filename) };
}

export function magicMatches(mime, bytes) {
  const signatures = FILE_TYPES[mime]?.magic || [];
  return signatures.some(signature => signature.every((byte, index) => bytes[index] === byte));
}

async function resolvePublicHost(hostname) {
  if (isPrivateAddress(hostname)) return false;
  if (typeof Deno === 'undefined' || typeof Deno.resolveDns !== 'function') return true;
  const results = [];
  for (const type of ['A', 'AAAA']) {
    try { results.push(...await Deno.resolveDns(hostname, type)); } catch { /* a host may only publish one family */ }
  }
  return results.length > 0 && results.every(address => !isPrivateAddress(address));
}

export async function verifyRemoteFile(input, options = {}) {
  let validation = validateFileReference(input, options);
  if (!validation.ok) return validation;
  let current = validation.url;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    if (!await resolvePublicHost(current.hostname)) return { ok: false, error: 'private_network_blocked' };
    let response;
    try {
      response = await fetch(current, { method: 'GET', redirect: 'manual', headers: { Range: 'bytes=0-15', Accept: '*/*' } });
    } catch {
      return { ok: false, error: 'file_unreachable' };
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirect === MAX_REDIRECTS) return { ok: false, error: 'too_many_redirects' };
      const location = response.headers.get('location');
      if (!location) return { ok: false, error: 'invalid_redirect' };
      const next = new URL(location, current);
      validation = validateFileReference({ ...input, url: next.href }, options);
      if (!validation.ok) return validation;
      current = validation.url;
      continue;
    }
    if (!response.ok && response.status !== 206) return { ok: false, error: 'file_unreachable' };
    const actualMime = String(response.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
    if (actualMime !== validation.mime) return { ok: false, error: 'file_mime_mismatch' };
    const contentLength = Number(response.headers.get('content-length') || 0);
    const totalFromRange = Number((response.headers.get('content-range') || '').split('/')[1] || 0);
    const actualSize = totalFromRange || contentLength;
    if (actualSize && actualSize > Number(options.maxBytes || DEFAULT_MAX_BYTES)) return { ok: false, error: 'file_too_large' };
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!magicMatches(validation.mime, bytes)) return { ok: false, error: 'file_signature_mismatch' };
    return { ...validation, ok: true, finalUrl: current.href, actualSize: actualSize || validation.size };
  }
  return { ok: false, error: 'file_validation_failed' };
}
