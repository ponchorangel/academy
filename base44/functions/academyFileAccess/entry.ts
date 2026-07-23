import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function response(body: Record<string, unknown>, status = 200) { return Response.json(body, { status }); }

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || user.disabled === true) return response({ error: 'unauthorized' }, 401);
    const input = await req.json().catch(() => ({}));
    const organizationId = String(input.organization_id || '').trim().slice(0, 100);
    const downloadId = String(input.download_id || '').trim().slice(0, 100);
    if (!organizationId || !downloadId) return response({ error: 'invalid_request' }, 400);
    const membership = (await base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, organization_id: organizationId, status: 'active' }))[0];
    if (!membership && user.role !== 'admin') return response({ error: 'forbidden' }, 403);
    const download = await base44.asServiceRole.entities.AcademyDownload.get(downloadId).catch(() => null);
    if (!download || download.organization_id !== organizationId || download.status !== 'published') return response({ error: 'not_found' }, 404);
    const fileUri = String(download.file_uri || '').trim();
    if (!fileUri.startsWith('private/') || fileUri.includes('..') || fileUri.split('/').some((part) => !part)) return response({ error: 'private_file_required' }, 400);
    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 300 });
    return response({ signed_url: signed.signed_url, expires_in: 300 });
  } catch (_error) { return response({ error: 'internal_error' }, 500); }
});
