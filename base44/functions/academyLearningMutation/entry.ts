import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || user.disabled === true) return response({ error: 'unauthorized' }, 401);
    const input = await req.json().catch(() => ({}));
    const action = safeText(input.action, 40).toLowerCase();
    const organizationId = safeText(input.organization_id, 100);
    if (!organizationId || !['enroll', 'complete_lesson'].includes(action)) return response({ error: 'invalid_request' }, 400);
    const membership = (await base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, organization_id: organizationId, status: 'active' }))[0];
    const isPlatformAdmin = user.role === 'admin' && !membership;
    if (!membership && !isPlatformAdmin) return response({ error: 'forbidden' }, 403);
    const now = new Date().toISOString();

    if (action === 'enroll') {
      const courseId = safeText(input.course_id, 100);
      const course = await base44.asServiceRole.entities.AcademyCourse.get(courseId).catch(() => null);
      if (!course || course.organization_id !== organizationId || !['published'].includes(course.status)) return response({ error: 'course_not_available' }, 404);
      const existing = (await base44.asServiceRole.entities.AcademyCourseEnrollment.filter({ organization_id: organizationId, course_id: courseId, user_id: user.id }))[0];
      if (existing?.status === 'enrolled' || existing?.status === 'completed') return response({ enrollment: existing });
      const enrollment = existing
        ? await base44.asServiceRole.entities.AcademyCourseEnrollment.update(existing.id, { status: 'enrolled', enrolled_at: existing.enrolled_at || now })
        : await base44.asServiceRole.entities.AcademyCourseEnrollment.create({ organization_id: organizationId, course_id: courseId, user_id: user.id, email: user.email || '', status: 'enrolled', progress_percent: 0, enrolled_at: now });
      return response({ enrollment });
    }

    const lessonId = safeText(input.lesson_id, 100);
    const lesson = await base44.asServiceRole.entities.AcademyCourseLesson.get(lessonId).catch(() => null);
    if (!lesson || lesson.organization_id !== organizationId) return response({ error: 'lesson_not_found' }, 404);
    const enrollment = (await base44.asServiceRole.entities.AcademyCourseEnrollment.filter({ organization_id: organizationId, course_id: lesson.course_id, user_id: user.id }))[0];
    if (!enrollment || enrollment.status === 'withdrawn') return response({ error: 'enrollment_required' }, 403);
    const progressRows = await base44.asServiceRole.entities.AcademyLessonProgress.filter({ organization_id: organizationId, course_id: lesson.course_id, user_id: user.id });
    const existingProgress = progressRows.find((item) => item.lesson_id === lessonId);
    const progress = existingProgress
      ? await base44.asServiceRole.entities.AcademyLessonProgress.update(existingProgress.id, { status: 'completed', completed_at: now, last_accessed_at: now })
      : await base44.asServiceRole.entities.AcademyLessonProgress.create({ organization_id: organizationId, course_id: lesson.course_id, module_id: lesson.module_id, lesson_id: lessonId, user_id: user.id, status: 'completed', completed_at: now, last_accessed_at: now });
    const lessons = await base44.asServiceRole.entities.AcademyCourseLesson.filter({ organization_id: organizationId, course_id: lesson.course_id, status: 'published' });
    const completedCount = progressRows.filter((item) => item.status === 'completed' && item.lesson_id !== lessonId).length + 1;
    const percent = lessons.length ? Math.min(100, Math.round((completedCount / lessons.length) * 100)) : 0;
    const enrollmentUpdate = await base44.asServiceRole.entities.AcademyCourseEnrollment.update(enrollment.id, { progress_percent: percent, status: percent === 100 ? 'completed' : 'enrolled', completed_at: percent === 100 ? now : enrollment.completed_at });
    return response({ progress, enrollment: enrollmentUpdate });
  } catch (_error) {
    return response({ error: 'internal_error' }, 500);
  }
});
