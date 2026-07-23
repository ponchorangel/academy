import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function response(body: Record<string, unknown>, status = 200) { return Response.json(body, { status }); }

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
    const base44 = createClientFromRequest(req);
    const input = await req.json().catch(() => ({}));
    const certificateNumber = String(input.certificate_number || '').trim().slice(0, 80);
    if (!certificateNumber || !/^ACD-\d{4}-[A-Z0-9]{8}$/.test(certificateNumber)) return response({ error: 'invalid_certificate_number' }, 400);
    const certificate = (await base44.asServiceRole.entities.AcademyCertificate.filter({ certificate_number: certificateNumber, status: 'issued' }))[0];
    if (!certificate) return response({ valid: false }, 404);
    return response({ valid: true, certificate: { certificate_number: certificate.certificate_number, student_name: certificate.student_name, course_title: certificate.course_title, issued_at: certificate.issued_at, status: certificate.status } });
  } catch (_error) { return response({ error: 'internal_error' }, 500); }
});
