import { Router } from 'express';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { validate } from '../middleware/validate.middleware.js';
import { AssignQuizSchema } from '../schemas/validation.schemas.js';
import { getIo, pushNotification } from '../socket/socket.server.js';
import { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { quizUpload } from '../middleware/upload.middleware.js';

const router = Router();
router.use(authenticate);

// ── DeepSeek client — module-level singleton (one HTTP agent for the process lifetime) ──
const aiClient: OpenAI | null = env.DEEPSEEK_API_KEY
  ? new OpenAI({ apiKey: env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' })
  : null;

// ── Shared types (kept in-file to avoid import issues) ────────
interface QuizQuestion {
  id: string;
  questionNumber: number;
  type: 'MCQ' | 'SHORT_ANSWER' | 'ESSAY' | 'TRUE_FALSE';
  question: string;
  options?: string[];    // MCQ: 4 choices; TRUE_FALSE: ["True","False"]
  marks: number;
  expectedAnswer: string; // teacher reference, hidden from students
}

interface QuizAnswer {
  questionId: string;
  answer: string;
  score?: number;
  feedback?: string;
}

// ── PDF text extraction ───────────────────────────────────────
async function extractPdfText(filePath: string): Promise<string | null> {
  try {
    // pdf-parse 2.x ships ESM; fall back to the module root for CJS interop
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('pdf-parse') as any;
    const pdfParse = mod.default ?? mod;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return (data.text as string | undefined)?.trim() || null;
  } catch {
    return null;
  }
}

// Helper: cast Prisma Json → typed array via unknown
function asQuizQuestions(json: unknown): QuizQuestion[] {
  return json as unknown as QuizQuestion[];
}
function asQuizAnswers(json: unknown): QuizAnswer[] {
  return json as unknown as QuizAnswer[];
}

// ── AI quiz generation ────────────────────────────────────────
async function generateQuizQuestions(
  client: OpenAI,
  context: { subject: string; grade?: string | null; topics: string[] },
  settings: { count: number; type: 'QUIZ' | 'EXAM' },
): Promise<QuizQuestion[]> {
  const isExam = settings.type === 'EXAM';
  const distribution = isExam
    ? `Mix: ~40% MCQ, ~30% SHORT_ANSWER, ~30% ESSAY. Exams test deep understanding.`
    : `Mix: ~50% MCQ, ~40% SHORT_ANSWER, ~10% ESSAY. Quizzes test quick recall and understanding.`;

  const prompt = `You are an expert educational assessment designer.

Generate exactly ${settings.count} questions for a ${settings.type} on the following topics:
Subject: ${context.subject}${context.grade ? ` (${context.grade})` : ''}
Topics covered:
${context.topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

${distribution}

Rules:
- MCQ must have exactly 4 distinct options; expectedAnswer = the full text of the correct option
- TRUE_FALSE options = ["True", "False"]; expectedAnswer = "True" or "False"
- SHORT_ANSWER: 2-4 sentence expected answer
- ESSAY: full paragraph expected answer (5-8 sentences)
- Marks: MCQ=1, TRUE_FALSE=1, SHORT_ANSWER=2-3, ESSAY=5-8
- Questions must be progressive and cover different topics
- expectedAnswer is a detailed model answer used for grading (not shown to students)

Return ONLY valid JSON — no markdown, no code fences:
{
  "questions": [
    {
      "questionNumber": 1,
      "type": "MCQ",
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "marks": 1,
      "expectedAnswer": "the correct option text"
    }
  ]
}`;

  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    temperature: 0.7,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = JSON.parse(completion.choices[0].message.content ?? '{}') as { questions: Omit<QuizQuestion, 'id'>[] };
  const questions = (raw.questions ?? []).slice(0, settings.count);

  return questions.map((q, i) => ({
    id: randomUUID(),
    questionNumber: i + 1,
    type: ['MCQ', 'SHORT_ANSWER', 'ESSAY', 'TRUE_FALSE'].includes(q.type) ? q.type : 'SHORT_ANSWER',
    question: q.question,
    options: q.options,
    marks: Number(q.marks) || 1,
    expectedAnswer: q.expectedAnswer ?? '',
  }));
}

// ── AI grading ────────────────────────────────────────────────
async function gradeSubmission(
  client: OpenAI,
  quiz: { title: string; questions: QuizQuestion[] },
  answers: QuizAnswer[],
): Promise<{ totalScore: number; maxScore: number; aiFeedback: string; gradedAnswers: QuizAnswer[] }> {

  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));

  const questionBlock = quiz.questions.map((q) => ({
    questionId: q.id,
    questionNumber: q.questionNumber,
    type: q.type,
    question: q.question,
    options: q.options,
    maxMarks: q.marks,
    expectedAnswer: q.expectedAnswer,
    studentAnswer: answerMap.get(q.id) ?? '(no answer)',
  }));

  const prompt = `You are a strict but fair examiner grading a student's ${quiz.title} submission.

For each question, award marks based on accuracy and completeness relative to the expected answer.

Guidelines:
- MCQ/TRUE_FALSE: Award full marks if the student's answer matches the expected answer (case-insensitive); 0 otherwise.
- SHORT_ANSWER: Award proportional marks based on how well the answer covers key concepts.
- ESSAY: Award marks based on depth, accuracy, structure, and coverage of key points.
- Be specific and constructive in per-question feedback (1-2 sentences).
- Overall feedback should be encouraging and mention 1-2 areas of strength and 1-2 areas to improve.

Questions to grade:
${JSON.stringify(questionBlock, null, 2)}

Return ONLY valid JSON — no markdown, no code fences:
{
  "totalScore": number,
  "maxScore": number,
  "overallFeedback": "string",
  "results": [
    { "questionId": "string", "score": number, "feedback": "string" }
  ]
}`;

  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = JSON.parse(completion.choices[0].message.content ?? '{}') as {
    totalScore: number;
    maxScore: number;
    overallFeedback: string;
    results: { questionId: string; score: number; feedback: string }[];
  };

  const resultMap = new Map((raw.results ?? []).map((r) => [r.questionId, r]));
  const maxScore = quiz.questions.reduce((s, q) => s + q.marks, 0);

  const gradedAnswers: QuizAnswer[] = answers.map((a) => {
    const result = resultMap.get(a.questionId);
    return {
      questionId: a.questionId,
      answer: a.answer,
      score: result ? Math.min(Math.max(Number(result.score), 0), quiz.questions.find((q) => q.id === a.questionId)?.marks ?? 0) : 0,
      feedback: result?.feedback ?? '',
    };
  });

  const totalScore = gradedAnswers.reduce((s, a) => s + (a.score ?? 0), 0);

  return {
    totalScore: Math.min(totalScore, maxScore),
    maxScore,
    aiFeedback: raw.overallFeedback ?? '',
    gradedAnswers,
  };
}

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────

// ── POST /api/quiz/generate — Teacher generates questions via AI
router.post('/generate', requireRole(Role.TEACHER, Role.ADMIN), async (req: AuthRequest, res) => {
  const client = aiClient;
  if (!client) { errorResponse(res, 'AI service not configured', 503); return; }

  const { subjectId, lessonIds, questionCount = 10, type = 'QUIZ' } = req.body as {
    subjectId: string;
    lessonIds: string[];
    questionCount?: number;
    type?: 'QUIZ' | 'EXAM';
  };

  if (!subjectId || !Array.isArray(lessonIds) || lessonIds.length === 0) {
    errorResponse(res, 'subjectId and at least one lessonId are required', 400); return;
  }

  const clampedCount = Math.min(Math.max(Number(questionCount), 3), 30);

  try {
    const [subject, lessons] = await Promise.all([
      prisma.subject.findUnique({ where: { id: subjectId }, select: { title: true, grade: true } }),
      prisma.lesson.findMany({
        where: { id: { in: lessonIds } },
        select: { title: true, content: true },
      }),
    ]);

    if (!subject) { errorResponse(res, 'Subject not found', 404); return; }
    if (lessons.length === 0) { errorResponse(res, 'No valid lessons found', 400); return; }

    const topics = lessons.map((l) => l.title + (l.content ? `: ${l.content.slice(0, 200)}` : ''));
    const questions = await generateQuizQuestions(
      client,
      { subject: subject.title, grade: subject.grade, topics },
      { count: clampedCount, type: (type as 'QUIZ' | 'EXAM') },
    );

    successResponse(res, { questions, totalMarks: questions.reduce((s, q) => s + q.marks, 0) });
  } catch (err) {
    console.error('[quiz/generate]', err);
    errorResponse(res, 'AI generation failed', 500);
  }
});

// ── POST /api/quiz — Teacher saves a quiz (draft or published)
router.post('/', requireRole(Role.TEACHER, Role.ADMIN), async (req: AuthRequest, res) => {
  const { title, type, subjectId, instructions, questions, totalMarks, durationMin, status } = req.body as {
    title: string; type: string; subjectId: string; instructions?: string;
    questions: QuizQuestion[]; totalMarks: number; durationMin?: number; status?: string;
  };

  if (!title?.trim() || !subjectId || !Array.isArray(questions) || questions.length === 0) {
    errorResponse(res, 'title, subjectId, and questions are required', 400); return;
  }

  // Verify teacher owns/teaches this subject
  const teacherId = req.user!.userId;
  if (req.user?.role === Role.TEACHER) {
    const assigned = await prisma.subjectTeacher.findUnique({ where: { subjectId_teacherId: { subjectId, teacherId } } });
    if (!assigned) { errorResponse(res, 'You are not assigned to this subject', 403); return; }
  }

  const quiz = await prisma.quiz.create({
    data: {
      title: title.trim(),
      type: type === 'EXAM' ? 'EXAM' : 'QUIZ',
      subjectId,
      teacherId,
      instructions: instructions?.trim() || null,
      questions: questions as object,
      totalMarks: Number(totalMarks) || questions.reduce((s: number, q: QuizQuestion) => s + q.marks, 0),
      durationMin: durationMin ? Number(durationMin) : null,
      status: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    },
    include: {
      subject: { select: { id: true, title: true, color: true, grade: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { assignments: true, submissions: true } },
    },
  });

  successResponse(res, quiz, 201);
});

// ── GET /api/quiz — List quizzes by role
router.get('/', async (req: AuthRequest, res) => {
  const role = req.user?.role;
  const userId = req.user!.userId;

  try {
    if (role === Role.TEACHER) {
      // Teacher: their own quizzes
      const quizzes = await prisma.quiz.findMany({
        where: { teacherId: userId },
        include: {
          subject: { select: { id: true, title: true, color: true, grade: true } },
          _count: { select: { assignments: true, submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return successResponse(res, quizzes);
    }

    if (role === Role.ADMIN) {
      const quizzes = await prisma.quiz.findMany({
        include: {
          subject: { select: { id: true, title: true, color: true, grade: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { assignments: true, submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return successResponse(res, quizzes);
    }

    if (role === Role.STUDENT) {
      // Student: quizzes assigned to them directly or via their groups
      const [directAssignments, groupMemberships] = await Promise.all([
        prisma.quizAssignment.findMany({
          where: { studentId: userId },
          select: { quizId: true, dueDate: true },
        }),
        prisma.groupMember.findMany({
          where: { userId },
          select: { groupId: true },
        }),
      ]);

      const groupIds = groupMemberships.map((m) => m.groupId);
      const groupAssignments = groupIds.length
        ? await prisma.quizAssignment.findMany({
            where: { groupId: { in: groupIds } },
            select: { quizId: true, dueDate: true },
          })
        : [];

      // Deduplicate quiz IDs, pick earliest due date if multiple assignments
      const quizDueMap = new Map<string, Date | null>();
      for (const a of [...directAssignments, ...groupAssignments]) {
        if (!quizDueMap.has(a.quizId)) {
          quizDueMap.set(a.quizId, a.dueDate);
        } else if (a.dueDate) {
          const existing = quizDueMap.get(a.quizId);
          if (!existing || a.dueDate < existing) quizDueMap.set(a.quizId, a.dueDate);
        }
      }

      if (quizDueMap.size === 0) return successResponse(res, []);

      const [quizzes, submissions] = await Promise.all([
        prisma.quiz.findMany({
          where: { id: { in: [...quizDueMap.keys()] }, status: 'PUBLISHED' },
          include: {
            subject: { select: { id: true, title: true, color: true } },
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.quizSubmission.findMany({
          where: { quizId: { in: [...quizDueMap.keys()] }, studentId: userId },
          select: { quizId: true, status: true, score: true, maxScore: true, submittedAt: true },
        }),
      ]);

      const submissionMap = new Map(submissions.map((s) => [s.quizId, s]));
      const result = quizzes.map((q) => ({
        ...q,
        dueDate: quizDueMap.get(q.id) ?? null,
        submission: submissionMap.get(q.id) ?? null,
        // Hide expectedAnswer from students
        questions: asQuizQuestions(q.questions).map(({ expectedAnswer: _ea, ...rest }) => rest),
      }));
      return successResponse(res, result);
    }

    errorResponse(res, 'Forbidden', 403);
  } catch (err) {
    console.error('[GET /quiz]', err);
    errorResponse(res, 'Failed to load quizzes', 500);
  }
});

// ── GET /api/quiz/:id — Quiz detail
router.get('/:id', async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: req.params.id },
    include: {
      subject: { select: { id: true, title: true, color: true, grade: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
      assignments: {
        include: {
          group: { select: { id: true, name: true } },
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      _count: { select: { submissions: true } },
    },
  });

  if (!quiz) { errorResponse(res, 'Quiz not found', 404); return; }

  const role = req.user?.role;
  const userId = req.user!.userId;

  // Students see published quizzes only, and questions without expectedAnswer
  if (role === Role.STUDENT) {
    if (quiz.status !== 'PUBLISHED') { errorResponse(res, 'Quiz not found', 404); return; }
    const sanitized = {
      ...quiz,
      questions: asQuizQuestions(quiz.questions).map(({ expectedAnswer: _ea, ...rest }) => rest),
    };
    return successResponse(res, sanitized);
  }

  // Teachers can only see their own quizzes
  if (role === Role.TEACHER && quiz.teacherId !== userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  successResponse(res, quiz);
});

// ── PUT /api/quiz/:id — Update quiz (teacher/admin, DRAFT only)
router.put('/:id', requireRole(Role.TEACHER, Role.ADMIN), async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  if (!quiz) { errorResponse(res, 'Quiz not found', 404); return; }
  if (req.user?.role === Role.TEACHER && quiz.teacherId !== req.user.userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }
  // Prevent editing a published quiz — submissions may already exist and changing
  // questions or expectedAnswers would silently corrupt existing grades.
  // Allow status-only updates (PUBLISHED → DRAFT) so staff can unpublish if needed.
  const isStatusOnlyUpdate = Object.keys(req.body).length === 1 && 'status' in req.body;
  if (quiz.status === 'PUBLISHED' && !isStatusOnlyUpdate) {
    errorResponse(res, 'Cannot edit a published quiz. Unpublish it first.', 422); return;
  }

  const { title, instructions, questions, totalMarks, durationMin, status } = req.body as Partial<{
    title: string; instructions: string; questions: QuizQuestion[]; totalMarks: number; durationMin: number; status: string;
  }>;

  const updated = await prisma.quiz.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(instructions !== undefined ? { instructions: instructions.trim() || null } : {}),
      ...(questions !== undefined ? { questions: questions as object, totalMarks: totalMarks ?? questions.reduce((s, q) => s + q.marks, 0) } : {}),
      ...(durationMin !== undefined ? { durationMin: durationMin || null } : {}),
      ...(status !== undefined ? { status: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT' } : {}),
    },
    include: {
      subject: { select: { id: true, title: true, color: true } },
      _count: { select: { assignments: true, submissions: true } },
    },
  });
  successResponse(res, updated);
});

// ── DELETE /api/quiz/:id
router.delete('/:id', requireRole(Role.TEACHER, Role.ADMIN), async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  if (!quiz) { errorResponse(res, 'Quiz not found', 404); return; }
  if (req.user?.role === Role.TEACHER && quiz.teacherId !== req.user.userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }
  await prisma.quiz.delete({ where: { id: req.params.id } });
  successResponse(res, { message: 'Quiz deleted' });
});

// ── POST /api/quiz/:id/assign — Assign quiz to groups and/or students
router.post('/:id/assign', requireRole(Role.TEACHER, Role.ADMIN), validate(AssignQuizSchema), async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  if (!quiz) { errorResponse(res, 'Quiz not found', 404); return; }
  if (req.user?.role === Role.TEACHER && quiz.teacherId !== req.user.userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  // Zod validation already ensures groupIds + studentIds combined is non-empty
  const { groupIds = [], studentIds = [], dueDate } = req.body as {
    groupIds: string[];
    studentIds: string[];
    dueDate?: string;
  };

  const parsedDue = dueDate ? new Date(dueDate) : null;

  try {
    // Groups + students — run all find-then-upsert operations concurrently instead of sequentially.
    // QuizAssignment has no unique constraint on (quizId, groupId/studentId) so we use findFirst
    // + update/create, but fan them all out in parallel with Promise.all.
    await Promise.all([
      ...groupIds.map(async (groupId) => {
        const existing = await prisma.quizAssignment.findFirst({ where: { quizId: quiz.id, groupId } });
        if (existing) {
          await prisma.quizAssignment.update({ where: { id: existing.id }, data: { dueDate: parsedDue } });
        } else {
          await prisma.quizAssignment.create({ data: { quizId: quiz.id, groupId, dueDate: parsedDue } });
        }
      }),
      ...studentIds.map(async (studentId) => {
        const existing = await prisma.quizAssignment.findFirst({ where: { quizId: quiz.id, studentId } });
        if (existing) {
          await prisma.quizAssignment.update({ where: { id: existing.id }, data: { dueDate: parsedDue } });
        } else {
          await prisma.quizAssignment.create({ data: { quizId: quiz.id, studentId, dueDate: parsedDue } });
        }
      }),
    ]);

    // Notify assigned students (non-blocking)
    const studentIdsToNotify: string[] = [...studentIds];
    if (groupIds.length) {
      const members = await prisma.groupMember.findMany({
        where: { groupId: { in: groupIds } },
        select: { userId: true },
      });
      members.forEach((m) => { if (!studentIdsToNotify.includes(m.userId)) studentIdsToNotify.push(m.userId); });
    }
    if (studentIdsToNotify.length) {
      const notifTitle = `New ${quiz.type === 'EXAM' ? 'Exam' : 'Quiz'} Assigned`;
      const notifBody  = `"${quiz.title}" has been assigned to you.${parsedDue ? ` Due: ${parsedDue.toLocaleDateString()}` : ''}`;
      const notifLink  = `/lms/quiz/${quiz.id}/attempt`;

      // Persist to DB (source of truth for offline users)
      prisma.notification.createMany({
        data: studentIdsToNotify.map((userId) => ({
          userId, title: notifTitle, body: notifBody, type: 'quiz_assigned', link: notifLink,
        })),
        skipDuplicates: true,
      }).catch(console.error);

      // Push real-time to connected users via Socket.IO
      try {
        const io = getIo();
        studentIdsToNotify.forEach((uid) =>
          pushNotification(io, uid, { title: notifTitle, body: notifBody, type: 'quiz_assigned', link: notifLink })
        );
      } catch {
        // Socket not initialised (e.g. test env) — DB notification is the fallback
      }
    }

    const updated = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: {
          include: {
            group: { select: { id: true, name: true } },
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    successResponse(res, updated);
  } catch (err) {
    console.error('[quiz/assign]', err);
    errorResponse(res, 'Failed to assign quiz', 500);
  }
});

// ── DELETE /api/quiz/:id/assign/:assignmentId — Remove an assignment
router.delete('/:id/assign/:assignmentId', requireRole(Role.TEACHER, Role.ADMIN), async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  if (!quiz) { errorResponse(res, 'Quiz not found', 404); return; }
  if (req.user?.role === Role.TEACHER && quiz.teacherId !== req.user.userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }
  await prisma.quizAssignment.delete({ where: { id: req.params.assignmentId } });
  successResponse(res, { message: 'Assignment removed' });
});

// ── GET /api/quiz/:id/submissions — Teacher: all; Student: own only
router.get('/:id/submissions', async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  if (!quiz) { errorResponse(res, 'Quiz not found', 404); return; }

  const role = req.user?.role;
  const userId = req.user!.userId;

  if (role === Role.STUDENT) {
    const sub = await prisma.quizSubmission.findUnique({
      where: { quizId_studentId: { quizId: req.params.id, studentId: userId } },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    return successResponse(res, sub ? [sub] : []);
  }

  if (role === Role.TEACHER && quiz.teacherId !== userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const submissions = await prisma.quizSubmission.findMany({
    where: { quizId: req.params.id },
    include: { student: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
    orderBy: { submittedAt: 'desc' },
  });
  successResponse(res, submissions);
});

// ── POST /api/quiz/:id/submit — Student submits answers
router.post(
  '/:id/submit',
  quizUpload.single('attachment'),
  async (req: AuthRequest, res) => {
    if (req.user?.role !== Role.STUDENT) {
      errorResponse(res, 'Only students can submit quizzes', 403); return;
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz || quiz.status !== 'PUBLISHED') { errorResponse(res, 'Quiz not found', 404); return; }

    const userId = req.user.userId;

    // One submission per student per quiz
    const existing = await prisma.quizSubmission.findUnique({
      where: { quizId_studentId: { quizId: req.params.id, studentId: userId } },
    });
    if (existing) { errorResponse(res, 'You have already submitted this quiz', 409); return; }

    // Parse answers from body (sent as JSON string in multipart OR plain JSON)
    let answers: QuizAnswer[] = [];
    try {
      const raw = typeof req.body.answers === 'string' ? req.body.answers : JSON.stringify(req.body.answers ?? []);
      const parsed: QuizAnswer[] = JSON.parse(raw);
      // Cap individual answer length so the grading prompt can't overflow the model's context window
      answers = parsed.map((a) => ({
        ...a,
        answer: typeof a.answer === 'string' ? a.answer.slice(0, 4000) : '',
      }));
    } catch {
      errorResponse(res, 'Invalid answers format', 400); return;
    }

    // Handle file attachment
    let attachmentUrl: string | null = null;
    let attachmentText: string | null = null;

    if (req.file) {
      attachmentUrl = `/uploads/quiz-submissions/${req.file.filename}`;
      if (req.file.mimetype === 'application/pdf') {
        attachmentText = await extractPdfText(req.file.path);
      }
      // If attachment has text and no text answers for a question, use attachment text as fallback
      if (attachmentText) {
        const questions = asQuizQuestions(quiz.questions);
        const answeredIds = new Set(answers.map((a) => a.questionId));
        for (const q of questions) {
          if (!answeredIds.has(q.id)) {
            answers.push({ questionId: q.id, answer: attachmentText.slice(0, 2000) });
          }
        }
      }
    }

    // Save submission with GRADING status
    const submission = await prisma.quizSubmission.create({
      data: {
        quizId: req.params.id,
        studentId: userId,
        answers: answers as object,
        attachmentUrl,
        attachmentText,
        status: 'GRADING',
        maxScore: quiz.totalMarks,
      },
    });

    // Grade synchronously (DeepSeek is fast enough for single submissions)
    const client = aiClient;
    if (client) {
      try {
        const questions = asQuizQuestions(quiz.questions);
        const result = await gradeSubmission(client, { title: quiz.title, questions }, answers);
        const graded = await prisma.quizSubmission.update({
          where: { id: submission.id },
          data: {
            answers: result.gradedAnswers as object,
            status: 'GRADED',
            score: result.totalScore,
            maxScore: result.maxScore,
            aiFeedback: result.aiFeedback,
            gradedAt: new Date(),
          },
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        });
        return successResponse(res, graded, 201);
      } catch (gradingErr) {
        console.error('[quiz/submit] Grading failed, returning PENDING:', gradingErr);
        // Return the submission with PENDING status so student knows it needs re-grading
        await prisma.quizSubmission.update({ where: { id: submission.id }, data: { status: 'PENDING' } });
      }
    }

    const result = await prisma.quizSubmission.findUnique({
      where: { id: submission.id },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    successResponse(res, result, 201);
  }
);

// ── POST /api/quiz/:id/submissions/:sid/regrade — Manual regrade trigger (teacher/admin)
router.post('/:id/submissions/:sid/regrade', requireRole(Role.TEACHER, Role.ADMIN), async (req: AuthRequest, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  if (!quiz) { errorResponse(res, 'Quiz not found', 404); return; }
  if (req.user?.role === Role.TEACHER && quiz.teacherId !== req.user.userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const submission = await prisma.quizSubmission.findUnique({ where: { id: req.params.sid } });
  if (!submission) { errorResponse(res, 'Submission not found', 404); return; }

  const client = aiClient;
  if (!client) { errorResponse(res, 'AI service not configured', 503); return; }

  try {
    const questions = asQuizQuestions(quiz.questions);
    const answers = asQuizAnswers(submission.answers).map((a) => ({ questionId: a.questionId, answer: a.answer }));
    const result = await gradeSubmission(client, { title: quiz.title, questions }, answers);

    const graded = await prisma.quizSubmission.update({
      where: { id: submission.id },
      data: {
        answers: result.gradedAnswers as object,
        status: 'GRADED',
        score: result.totalScore,
        maxScore: result.maxScore,
        aiFeedback: result.aiFeedback,
        gradedAt: new Date(),
      },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    successResponse(res, graded);
  } catch (err) {
    console.error('[regrade]', err);
    errorResponse(res, 'Regrading failed', 500);
  }
});

export default router;
