import { Router } from 'express';
import OpenAI from 'openai';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';
import { env } from '../config/env.js';

const router = Router();
router.use(authenticate);

// ── DeepSeek client — module-level singleton (one HTTPS pool, not one per request)
const aiClient: OpenAI | null = env.DEEPSEEK_API_KEY
  ? new OpenAI({ apiKey: env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' })
  : null;

// ── System prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert teaching assistant for Online Quran Academy, an online platform specialising in Quran recitation education.

You help Quran teachers with:
- Explaining Tajweed rules clearly and in full detail (Makharij, Sifat, Madd, Ghunna, Idghaam, Ikhfa, etc.)
- Crafting lesson plans, structured explanations, analogies, and recitation exercises
- Answering questions about Quranic Arabic pronunciation and recitation rules with depth and accuracy
- Reviewing and improving lesson content for different student levels
- Suggesting teaching strategies and practical recitation tips
- Breaking difficult Tajweed concepts into digestible, student-friendly steps

Guidelines:
- Always give detailed, comprehensive answers — teachers need enough depth to teach from
- Use clear structure: headings, bullet points, numbered steps where relevant
- Include practical recitation examples and memory aids to make abstract rules tangible
- Transliterate Arabic words when helpful for pronunciation clarity
- Use Markdown formatting throughout for better readability
- Be encouraging and supportive in tone
- When referencing Quranic verses or terms, use proper transliteration and be respectful`;

// ── GET /api/assistant/status — check if AI is configured ─────
router.get('/status', requireRole(Role.TEACHER, Role.ADMIN), (_req, res) => {
  res.json({ available: !!env.DEEPSEEK_API_KEY });
});

// ── POST /api/assistant/chat — streaming SSE response ─────────
router.post(
  '/chat',
  requireRole(Role.TEACHER, Role.ADMIN),
  async (req: AuthRequest, res) => {
    if (!aiClient) {
      res.status(503).json({ error: 'AI assistant is not configured (DEEPSEEK_API_KEY missing)' });
      return;
    }


    const {
      message,
      history = [],
    }: {
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
    } = req.body;

    if (!message?.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    // ── SSE headers ───────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering
    res.flushHeaders();

    const send = (payload: object) =>
      res.write(`data: ${JSON.stringify(payload)}\n\n`);

    try {
      const stream = await aiClient.chat.completions.create({
        model: 'deepseek-chat',
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.slice(-20), // keep last 20 turns to avoid token overflow
          { role: 'user', content: message.trim() },
        ],
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) send({ delta });
      }

      send({ done: true });
      res.end();
    } catch (err: unknown) {
      console.error('DeepSeek API error:', err);
      const msg =
        (err as { message?: string })?.message ?? 'AI service error';
      send({ error: msg });
      res.end();
    }
  }
);

export default router;
