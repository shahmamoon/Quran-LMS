import { Router } from 'express';
import OpenAI from 'openai';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { Role } from '@prisma/client';
import { env } from '../config/env.js';

const router = Router();
router.use(authenticate);

// ── DeepSeek client — module-level singleton ──────────────────
const aiClient: OpenAI | null = env.DEEPSEEK_API_KEY
  ? new OpenAI({ apiKey: env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' })
  : null;

// ── Types ─────────────────────────────────────────────────────
interface GeneratedLesson {
  title: string;
  description: string;
  type: 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
  durationMinutes: number;
}

interface GeneratedWeek {
  weekNumber: number;
  title: string;
  lessons: GeneratedLesson[];
}

interface GeneratedCurriculum {
  subjectTitle: string;
  weeks: GeneratedWeek[];
}

const VALID_LESSON_TYPES = new Set(['TEXT', 'QUIZ', 'ASSIGNMENT']);

function sanitizeCurriculum(
  raw: GeneratedCurriculum,
  numWeeks: number,
  lessonsPerWeek: number,
): GeneratedCurriculum {
  const weeks = raw.weeks
    .slice(0, numWeeks)
    .map((week, wi) => ({
      weekNumber: wi + 1,
      title: week.title ?? `Week ${wi + 1}`,
      lessons: week.lessons
        .slice(0, lessonsPerWeek)
        .map((lesson, li) => ({
          title: lesson.title ?? `Lesson ${li + 1}`,
          description: lesson.description ?? '',
          type: VALID_LESSON_TYPES.has(lesson.type) ? lesson.type : ('TEXT' as const),
          durationMinutes: Number(lesson.durationMinutes) || 45,
        })),
    }));

  return { subjectTitle: raw.subjectTitle ?? '', weeks };
}

// ── POST /api/curriculum-generator/generate ───────────────────
router.post('/generate', requireRole(Role.ADMIN), async (req, res) => {
  const client = aiClient;
  if (!client) {
    errorResponse(res, 'AI service is not configured (DEEPSEEK_API_KEY missing)', 503);
    return;
  }

  const { grade, subject, numWeeks = 8, lessonsPerWeek = 3 } = req.body as {
    grade: string;
    subject: string;
    numWeeks?: number;
    lessonsPerWeek?: number;
  };

  if (!grade || !subject) {
    errorResponse(res, 'grade and subject are required', 400);
    return;
  }

  const clampedWeeks = Math.min(Math.max(Number(numWeeks), 1), 20);
  const clampedLessons = Math.min(Math.max(Number(lessonsPerWeek), 1), 7);

  const systemPrompt = `You are an expert international curriculum designer. You create progressive, skill-based curricula in the style of Khan Academy and IXL — clear topic sequences from foundational to advanced.

Return ONLY valid JSON (no markdown, no code fences, no extra keys) exactly matching this schema:
{
  "subjectTitle": "string (a specific title, e.g. 'Grade 6 Mathematics')",
  "weeks": [
    {
      "weekNumber": 1,
      "title": "string (week theme, e.g. 'Ratios and Proportions')",
      "lessons": [
        {
          "title": "string (specific lesson topic)",
          "description": "string (2–3 sentences describing what students will learn)",
          "type": "TEXT | QUIZ | ASSIGNMENT",
          "durationMinutes": 30
        }
      ]
    }
  ]
}

Rules:
- Exactly ${clampedWeeks} weeks, each with exactly ${clampedLessons} lesson(s)
- Follow internationally recognised progressions (Common Core, Cambridge, Singapore Math, NGSS — whichever fits)
- type must be exactly "TEXT", "QUIZ", or "ASSIGNMENT" — use QUIZ for assessments, ASSIGNMENT for projects/homework, TEXT for all other lessons
- durationMinutes should be realistic (20–90 minutes)
- Topics must be progressive: build on prior knowledge week by week
- No markdown, no comments, no trailing commas`;

  const userPrompt = `Generate a ${clampedWeeks}-week curriculum for ${subject}, ${grade}.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      temperature: 0.6,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? '{}') as GeneratedCurriculum;
    const curriculum = sanitizeCurriculum(raw, clampedWeeks, clampedLessons);
    successResponse(res, curriculum);
  } catch (err) {
    console.error('[curriculum-generator/generate]', err);
    errorResponse(res, 'Failed to generate curriculum — AI service error', 500);
  }
});

// ── POST /api/curriculum-generator/create ─────────────────────
router.post('/create', requireRole(Role.ADMIN), async (req, res) => {
  const { title, description, color, teacherId, grade, weeks } = req.body as {
    title: string;
    description?: string;
    color?: string;
    teacherId?: string;
    grade?: string;
    weeks: GeneratedWeek[];
  };

  if (!title?.trim()) {
    errorResponse(res, 'title is required', 400);
    return;
  }
  if (!Array.isArray(weeks) || weeks.length === 0) {
    errorResponse(res, 'weeks array is required', 400);
    return;
  }

  try {
    const subject = await prisma.$transaction(
      async (tx) => {
        // 1 — Create subject
        const created = await tx.subject.create({
          data: {
            title: title.trim(),
            description: description?.trim() ?? null,
            color: color ?? '#0e91e9',
            grade: grade?.trim() || null,
            ...(teacherId ? { teachers: { create: { teacherId } } } : {}),
          },
        });

        // 2 — Create weeks + lessons serially (each lesson needs the weekId)
        for (let wi = 0; wi < weeks.length; wi++) {
          const weekData = weeks[wi];
          const week = await tx.week.create({
            data: {
              subjectId: created.id,
              title: weekData.title,
              order: wi + 1,
            },
          });

          const lessons = weekData.lessons ?? [];
          for (let li = 0; li < lessons.length; li++) {
            const l = lessons[li];
            await tx.lesson.create({
              data: {
                weekId: week.id,
                title: l.title,
                type: VALID_LESSON_TYPES.has(l.type) ? (l.type as 'TEXT' | 'QUIZ' | 'ASSIGNMENT') : 'TEXT',
                content: l.description ?? null,
                duration: l.durationMinutes ?? 45,
                order: li + 1,
              },
            });
          }
        }

        return created;
      },
      { timeout: 30_000 }, // large curricula may take a moment
    );

    successResponse(res, { subjectId: subject.id, message: 'Subject created' }, 201);
  } catch (err) {
    console.error('[curriculum-generator/create]', err);
    errorResponse(res, 'Failed to create subject', 500);
  }
});

export default router;
