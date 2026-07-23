import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { safeText } from './_shared/security.js';

function response(body: Record<string, unknown>, status = 200) { return Response.json(body, { status }); }

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || user.disabled === true) return response({ error: 'unauthorized' }, 401);
    const input = await req.json().catch(() => ({}));
    const action = safeText(input.action, 40).toLowerCase();
    const organizationId = safeText(input.organization_id, 100);
    const membership = (await base44.asServiceRole.entities.AcademyMembership.filter({ user_id: user.id, organization_id: organizationId, status: 'active' }))[0];
    const canManage = user.role === 'admin' || ['superadmin', 'organization_admin', 'teacher'].includes(membership?.role);
    if (!organizationId || (!membership && user.role !== 'admin')) return response({ error: 'forbidden' }, 403);

    if (action === 'create_question') {
      if (!canManage) return response({ error: 'forbidden' }, 403);
      const data = input.data || {};
      const lessonId = safeText(data.lesson_id, 100);
      const lesson = await base44.asServiceRole.entities.AcademyCourseLesson.get(lessonId).catch(() => null);
      if (!lesson || lesson.organization_id !== organizationId || lesson.lesson_type !== 'quiz') return response({ error: 'quiz_lesson_required' }, 400);
      const options = Array.isArray(data.options) ? data.options.map((item: unknown) => safeText(item, 300)).filter(Boolean).slice(0, 6) : [];
      const correctOption = Number(data.correct_option);
      if (!safeText(data.prompt, 1000) || options.length < 2 || !Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length) return response({ error: 'invalid_question' }, 400);
      const existing = await base44.asServiceRole.entities.AcademyQuizQuestion.filter({ organization_id: organizationId, lesson_id: lessonId });
      const question = await base44.asServiceRole.entities.AcademyQuizQuestion.create({ organization_id: organizationId, course_id: lesson.course_id, lesson_id: lessonId, prompt: safeText(data.prompt, 1000), options, correct_option: correctOption, explanation: safeText(data.explanation, 1000), order: existing.length, status: 'published' });
      return response({ question });
    }

    const lessonId = safeText(input.lesson_id, 100);
    const lesson = await base44.asServiceRole.entities.AcademyCourseLesson.get(lessonId).catch(() => null);
    if (!lesson || lesson.organization_id !== organizationId || lesson.lesson_type !== 'quiz') return response({ error: 'quiz_not_found' }, 404);
    const questions = await base44.asServiceRole.entities.AcademyQuizQuestion.filter({ organization_id: organizationId, lesson_id: lessonId, status: 'published' });
    if (action === 'get_quiz') return response({ questions: questions.map((question) => ({ id: question.id, prompt: question.prompt, options: question.options, order: question.order })) });
    if (action !== 'submit_quiz') return response({ error: 'invalid_request' }, 400);
    const enrollment = (await base44.asServiceRole.entities.AcademyCourseEnrollment.filter({ organization_id: organizationId, course_id: lesson.course_id, user_id: user.id }))[0];
    if (!enrollment || enrollment.status === 'withdrawn') return response({ error: 'enrollment_required' }, 403);
    const answers = Array.isArray(input.answers) ? input.answers.map((answer: unknown) => Number(answer)) : [];
    const correct = questions.reduce((total, question, index) => total + (answers[index] === question.correct_option ? 1 : 0), 0);
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const passed = score >= 70;
    const attempt = await base44.asServiceRole.entities.AcademyQuizAttempt.create({ organization_id: organizationId, course_id: lesson.course_id, lesson_id: lessonId, user_id: user.id, score, passed, answers: answers.slice(0, questions.length), attempted_at: new Date().toISOString() });
    return response({ attempt: { id: attempt.id, score, passed }, explanations: passed ? questions.map((question) => question.explanation || '') : [] });
  } catch (_error) { return response({ error: 'internal_error' }, 500); }
});
