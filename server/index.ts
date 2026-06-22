import './config/env.js'; // validates env first
import 'express-async-errors'; // patches Express 4 to forward async rejections to error middleware
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import { initSocketServer } from './socket/socket.server.js';
import { authenticate, AuthRequest } from './middleware/auth.middleware.js';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import subjectsRoutes from './routes/subjects.routes.js';
import curriculumRoutes from './routes/curriculum.routes.js';
import sessionsRoutes from './routes/sessions.routes.js';
import groupsRoutes from './routes/groups.routes.js';
import chatRoutes from './routes/chat.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import assistantRoutes from './routes/assistant.routes.js';
import curriculumGeneratorRoutes from './routes/curriculum-generator.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import zoomRoutes from './routes/zoom.routes.js';
import googleRoutes from './routes/google.routes.js';
import dailyRoutes from './routes/daily.routes.js';
import blogRoutes from './routes/blog.routes.js';
import paymentsRoutes, { stripeWebhookHandler } from './routes/payments.routes.js';
import blogTopicsRoutes from './routes/blog-topics.routes.js';
import recitationRoutes from './routes/recitation.routes.js';
import quranReaderRoutes from './routes/quran-reader.routes.js';
import qaidaRoutes from './routes/qaida.routes.js';
import islamicRoutes from './routes/islamic.routes.js';
import activityRoutes from './routes/activity.routes.js';

import { prisma } from './config/prisma.js';
import { renderPostPage, renderListPage, renderSitemap, renderRss } from './blog/render.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// ─── Socket.io ────────────────────────────────────────────────
initSocketServer(httpServer);

// ─── Canonical host: redirect www → non-www (SEO duplicate-content fix) ──
// Caddy preserves the original Host header when proxying, so req.headers.host
// reflects what the visitor typed. 301 so search engines collapse to one URL.
app.use((req, res, next) => {
  const host = req.headers.host ?? '';
  if (host.startsWith('www.')) {
    return res.redirect(301, `https://${host.slice(4)}${req.originalUrl}`);
  }
  next();
});

// ─── Security & Middleware ────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
// Custom Morgan token: strip ?token=<jwt> from logged URLs so bearer tokens
// don't appear in plaintext logs (recording download links carry token= param).
morgan.token('url-safe', (req: express.Request) => {
  const u = req.originalUrl ?? req.url ?? '';
  return u.replace(/([?&])token=[^&]*/gi, '$1token=REDACTED');
});
app.use(morgan(
  env.NODE_ENV === 'development'
    ? 'dev'
    : ':remote-addr - :remote-user [:date[clf]] ":method :url-safe HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
));

// ─── Stripe webhook — MUST be before express.json() (needs the RAW body for
// signature verification). This single route uses express.raw; all other
// payment routes are mounted normally below and get the JSON parser.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

// ─── Daily.co webhook — raw body needed for HMAC signature verification
app.use('/api/daily', express.raw({ type: 'application/json' }), dailyRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limit — keyed per authenticated user (userId) so NAT/shared IPs don't
// get pooled together. Falls back to IP for unauthenticated requests (login, blog).
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 500 : 5000,
  keyGenerator: (req) => (req as AuthRequest).user?.userId ?? req.ip ?? 'anon',
  skip: (req) => req.path === '/api/health',
}));

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/curriculum-generator', curriculumGeneratorRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/zoom', zoomRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/recitation', recitationRoutes);
app.use('/api/quran-reader', quranReaderRoutes);
app.use('/api/qaida', qaidaRoutes);
app.use('/api/islamic', islamicRoutes);
app.use('/api/blog/topics', blogTopicsRoutes); // before /api/blog so it isn't captured by GET /:slug
app.use('/api/blog', blogRoutes);
app.use('/api/payments', paymentsRoutes); // note: /api/payments/webhook is mounted above with raw body

// Serve uploaded quiz submissions — require a valid access token
app.use('/uploads', authenticate, express.static(path.resolve('uploads')));

// Serve Quran page images — public, no auth (static reference data)
app.use('/quran-pages', express.static(path.resolve('Quran'), { maxAge: '30d', immutable: true }));

// Serve Qaida page images — public, no auth (teacher-uploaded reference data)
// Images live in project root subfolders: Qaida/001.png, MadaniQaida/001.png, …
// Served at: /qaida-pages/Qaida/001.png, /qaida-pages/MadaniQaida/001.png, …
app.use('/qaida-pages', express.static(path.resolve('.'), { maxAge: '7d', fallthrough: true }));

// ─── Health check (used by Docker + load balancers) ──────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString(), demo: !!env.DEMO_MODE });
});

// ─── Catch-all 404 for unmatched /api/* routes ───────────────
// Must come after all /api route mounts so it only fires for unknown paths.
// Without this, unmatched API calls would fall through to the SPA catch-all
// and receive HTML instead of a JSON error response.
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// ─── Server-rendered Blog (SEO/GEO) ──────────────────────────
// Registered BEFORE the SPA catch-all so crawlers and AI models receive real
// HTML + meta + JSON-LD instead of the empty React shell. Works in every env.
// Route order matters: exact /blog, then /blog/rss.xml, then /blog/:slug.

app.get('/blog', async (_req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
    });
    res.type('html').send(renderListPage(posts));
  } catch (err) { next(err); }
});

app.get('/blog/rss.xml', async (_req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' }, take: 50,
    });
    res.type('application/rss+xml').send(renderRss(posts));
  } catch (err) { next(err); }
});

app.get('/blog/:slug', async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED', publishedAt: { lte: new Date() } },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
    if (!post) { res.status(404).type('html').send(renderListPage([])); return; }
    res.type('html').send(renderPostPage(post));
  } catch (err) { next(err); }
});

// Dynamic sitemap — replaces the static one; registered before express.static.
app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
    });
    res.type('application/xml').send(renderSitemap(posts));
  } catch (err) { next(err); }
});

// ─── Serve Vite Build in Production ──────────────────────────
if (env.NODE_ENV === 'production') {
  const distPath = path.resolve('dist');

  // Static assets. Vite fingerprints files under /assets/ with a content hash,
  // so they can be cached forever (a content change → a new filename). HTML is
  // never long-cached (so a redeploy is seen immediately).
  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));

  // Known SPA routes. Anything NOT matching these (and with no prerendered
  // .html) is a genuine unknown URL → real 404, so crawlers don't index thin
  // soft-404 pages. /blog, /sitemap.xml, /robots.txt are handled by earlier
  // routes and never reach here.
  const PUBLIC_ROUTES = new Set([
    '/', '/about', '/programs', '/book', '/confirmation', '/privacy', '/terms', '/faq',
  ]);
  const isKnownRoute = (p: string): boolean => {
    const path0 = p === '/' ? '/' : p.replace(/\/$/, '');
    if (PUBLIC_ROUTES.has(path0)) return true;
    if (/^\/programs\/[^/]+$/.test(path0)) return true; // /programs/:slug detail pages
    if (path0 === '/lms' || path0.startsWith('/lms/')) return true; // whole authed app
    return false;
  };

  // Serve pre-rendered HTML for marketing routes (dist/about.html, etc.),
  // the SPA shell for known client routes, or a real 404 for unknown paths.
  app.get('*', (req, res) => {
    const clean   = req.path === '/' ? 'index' : req.path.replace(/\/$/, '');
    const prePath = path.join(distPath, clean + '.html');

    if (fs.existsSync(prePath)) {
      res.sendFile(prePath);
    } else if (isKnownRoute(req.path)) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      // Unknown URL: serve the SPA shell so the client renders its NotFound
      // view, but with a 404 status so search engines see a true 404.
      res.status(404).sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ─── Error Handler ────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────
httpServer.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`   NODE_ENV: ${env.NODE_ENV}`);
});

export { httpServer };
