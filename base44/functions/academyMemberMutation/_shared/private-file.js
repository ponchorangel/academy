import { verifyRemoteFile } from './file-security.js';

export function parsePrivatePrefixes(raw) {
  return String(raw || '').split(',').map(value => value.trim().replace(/^\/+/, '')).filter(Boolean).map(value => value.endsWith('/') ? value : `${value}/`);
}

export function validatePrivateFileUri(uri, rawPrefixes) {
  const value = String(uri || '').trim().replace(/^\/+/, '');
  const prefixes = parsePrivatePrefixes(rawPrefixes);
  if (prefixes.length === 0) return { ok: false, error: 'private_file_prefixes_not_configured' };
  if (!value || value.length > 1000 || value.includes('\\') || value.includes('\0') || value.split('/').some(part => !part || part === '.' || part === '..')) {
    return { ok: false, error: 'invalid_private_file_uri' };
  }
  if (!prefixes.some(prefix => value.startsWith(prefix))) return { ok: false, error: 'private_file_uri_not_allowed' };
  return { ok: true, fileUri: value };
}

// base44 aqui es el cliente creado con createClientFromRequest(req) para esta
// solicitud -- ya trae la sesion del actor. asServiceRole solo se usa para el
// paso puntual de firmar, despues de que validatePrivateFileUri (y, en la
// funcion que llama a esto, una comprobacion de que el actor puede ver este
// recurso) ya aprobaron la solicitud.
export async function verifyPrivateFile(base44, input, options = {}) {
  const privateRef = validatePrivateFileUri(input.fileUri, options.allowedPrivatePrefixes);
  if (!privateRef.ok) return privateRef;
  let signed;
  try {
    signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: privateRef.fileUri, expires_in: 300 });
  } catch {
    return { ok: false, error: 'private_file_signing_failed' };
  }
  const checked = await verifyRemoteFile({ ...input, url: signed?.signed_url }, options);
  return checked.ok ? { ...checked, fileUri: privateRef.fileUri } : checked;
}
