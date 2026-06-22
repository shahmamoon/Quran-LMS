# CLAUDE.md — Online Quran Academy LMS

This file tells Claude Code how to work effectively in this codebase.

---

## Project overview

A full-stack Learning Management System (LMS) for an online Quran academy, with a public marketing site.  
**Stack:** React 19 + Vite (frontend) · Express + TypeScript (backend) · PostgreSQL + Prisma (database) · Socket.IO (real-time) · DeepSeek AI (quiz & curriculum generation).

---

## Development commands

```bash
# Start everything (Vite on :3000, Express on :4000, requires Postgres in Docker)
docker compose up -d postgres   # start DB first
pnpm dev                        # starts both client + server concurrently

# Database
pnpm db:migrate                 # run pending migrations (prisma migrate dev)
pnpm db:seed                    # seed with demo data (tsx prisma/seed.ts)
                                # NOTE: also calls seed-quran-data automatically at the end
                                # QuranPage + TajweedRule rows are NOT wiped — only re-inserted if absent
pnpm db:seed:quran              # seed/re-seed Quran reference data only (idempotent, safe to re-run)
pnpm db:seed:core-courses       # upsert 5 core courses (Noorani Qaida English, Noorani Qaida Urdu, Quran with Tajweed, Prayers, Islamic Education)
pnpm db:seed:noorani-qaida      # upsert both Noorani Qaida courses (English + Urdu) — 6 weeks, 22 lessons each, CDN images
pnpm db:studio                  # open Prisma Studio at :5555
pnpm db:reset                   # DANGER: drop + re-migrate + re-seed

# Type checking
npx tsc --noEmit -p tsconfig.json         # frontend
npx tsc --noEmit -p tsconfig.server.json  # backend

# Tests (Playwright E2E — requires both servers + DB running)
pnpm test                       # headless
pnpm test:ui                    # Playwright UI mode
pnpm test:headed                # with browser visible
pnpm test:unit                  # Vitest unit tests (no server/DB needed)

# Clean test data after a Playwright run
npx tsx scripts/cleanup-playwright-data.ts
```

---

## Project structure

```
/
├── src/                        # React frontend (Vite)
│   ├── pages/                  # Public marketing pages (Home, About, Programs, Booking, Privacy, Terms, FAQ)
│   ├── components/             # Shared public components (Navbar, Footer, WhatsAppWidget)
│   └── lms/
│       ├── components/
│       │   ├── layout/         # LMSLayout, LMSSidebar (auth + nav shell)
│       │   ├── auth/           # ProtectedRoute
│       │   └── ui/             # Design system — Button, Card, Badge, Modal, Input, QuranPageModal…
│       ├── pages/              # One folder per LMS page
│       │   ├── subjects/       # Subjects (course landing), SubjectDetail (router),
│       │   │                   # QuranProgress, NooraniQaida
│       │   └── recitation/     # MushaafGrid, RecitationSessions, RecitationSessionView,
│       │                       # StudentRecitationView
│       ├── store/              # Zustand stores (auth, notification, chat)
│       ├── lib/                # api.ts (axios), socket.ts, queryClient.ts, utils.ts
│       └── types/              # Shared TypeScript types (index.ts)
│
├── server/                     # Express backend (ESM, tsx)
│   ├── config/                 # env.ts (Zod-validated), prisma.ts (singleton)
│   ├── middleware/             # auth, error, validate (Zod), upload (Multer)
│   ├── routes/                 # One file per resource
│   │   ├── recitation.routes.ts    # /api/recitation — sessions, attempts, progress
│   │   ├── daily.routes.ts         # /api/daily — Daily.co webhook (recording → R2)
│   │   └── sessions.routes.ts      # /api/sessions — Zoom/Google Meet/Daily.co
│   ├── schemas/                # Zod schemas (validation.schemas.ts)
│   ├── services/
│   │   ├── r2.service.ts           # Cloudflare R2 — presigned URLs, stream, upload, delete
│   │   ├── daily.service.ts        # Daily.co — room create/delete, recording download, HMAC verify
│   │   ├── google-meet.service.ts  # Google Calendar OAuth + Meet link creation
│   │   ├── zoom.service.ts         # Zoom S2S OAuth + meeting CRUD
│   │   ├── stripe.service.ts       # Stripe checkout sessions + subscription management
│   │   └── email.service.ts        # Nodemailer wrapper
│   ├── socket/                 # socket.server.ts — Socket.IO singleton
│   └── utils/                  # jwt.utils.ts, response.utils.ts, audit.utils.ts
│
├── prisma/
│   ├── schema.prisma           # Single source of truth for DB schema
│   ├── seed.ts                 # Demo data — DESTRUCTIVE (wipes + recreates). Never run on prod.
│   └── migrations/             # Applied migration history
│
├── tests/                      # Playwright E2E specs (numbered 01–15)
│   ├── auth.setup.ts           # Creates auth state files for all 3 roles
│   └── helpers/                # Shared test helpers
│
├── .github/workflows/
│   ├── deploy.yml                  # Push to main → build image → deploy prod (migrations only, no seed)
│   ├── deploy-demo.yml             # Manual only → deploy demo (migrate + wipe + reseed)
│   ├── seed-demo.yml               # Manual: wipe + reseed demo DB on demand
│   ├── seed-db.yml                 # Manual: wipe production DB + create single admin account
│   ├── seed-students.yml           # Manual: upsert a fixed set of STUDENT accounts on prod (idempotent, never resets passwords)
│   ├── seed-blog.yml               # Manual: upsert starter SEO blog posts on prod (idempotent)
│   ├── seed-ai-fundamentals.yml    # Manual: add "AI Fundamentals" subject + 23 lessons on prod (idempotent)
│   ├── split-ai-fundamentals.yml   # Manual: split AI Fundamentals into 12 weeks (preserves live order; guarded)
│   ├── diagnose-ai-fundamentals.yml# Manual: READ-ONLY dump of AI Fundamentals subject/week/lesson structure
│   └── backup-prod-db.yml          # Daily 03:00 UTC (+ manual): pg_dump prod DB → GitHub artifact (off-VPS, 30-day retention)
│
├── docker-compose.yml          # Local dev: PostgreSQL only
├── docker-compose.prod.yml     # Production: app container on port 4000
├── docker-compose.demo.yml     # Demo: app container on port 4003, quranacademy_demo DB
│
└── scripts/
    ├── reset-prod.ts                # Wipes production DB, creates single admin account
    ├── seed-quran-data.ts           # Idempotent upsert of 604 QuranPage + 20 TajweedRule rows (db:seed:quran)
    │                                # Also called automatically at the end of prisma/seed.ts
    ├── seed-core-courses.ts         # Idempotent upsert of 5 core courses (db:seed:core-courses)
    ├── seed-noorani-qaida.ts        # Idempotent upsert of both Noorani Qaida courses — English + Urdu (db:seed:noorani-qaida)
    ├── seed-students.ts             # Idempotent upsert of fixed STUDENT accounts (db:seed:students); never overwrites existing users
    ├── seed-blog-posts.ts           # Idempotent upsert of 8 starter SEO blog articles (db:seed:blog)
    ├── seed-ai-fundamentals.ts      # Idempotent seed of AI Fundamentals subject + lessons (db:seed:ai-fundamentals)
    ├── split-ai-fundamentals-weeks.ts # One-shot: split AI Fundamentals into 12 weeks (db:split:ai-fundamentals)
    ├── diagnose-ai-fundamentals.ts  # READ-ONLY structure dump for debugging
    ├── seed-content-engine.ts       # Idempotent: Content Bot user + P1 topic queue (db:seed:content-engine)
    └── cleanup-playwright-data.ts   # Removes test-created records from DB
```

---

## Key conventions

### Backend

**Response shape** — always use helpers from `server/utils/response.utils.ts`:
```ts
successResponse(res, data, 201);   // { success: true, data }
errorResponse(res, 'message', 400); // { success: false, message }
```

**Validation** — Zod schemas live in `server/schemas/validation.schemas.ts`; apply with:
```ts
import { validate } from '../middleware/validate.middleware.js';
router.post('/', validate(SomeSchema), async (req, res) => { ... });
```

**Audit logging** — fire-and-forget, never fails the parent request:
```ts
import { logAudit } from '../utils/audit.utils.js';
logAudit(req, 'CREATE', 'User', user.id, { email });
```

**Socket push** — get the singleton then push:
```ts
import { getIo, pushNotification } from '../socket/socket.server.js';
const io = getIo(); // throws if called before initSocketServer
pushNotification(io, userId, { title, body, type, link });
```

**Prisma JSON fields** — cast explicitly to avoid TS errors:
```ts
import { Prisma } from '@prisma/client';
metadata: value as Prisma.InputJsonObject | undefined
resources: value as Prisma.InputJsonValue | undefined
```

**Role guard** — use `requireRole` middleware:
```ts
router.post('/', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => { ... });
```

**AI client (DeepSeek)** — instantiate **once at module level**, never inside a function or request handler. Creating a new `OpenAI` instance per request creates a new connection pool on every call:
```ts
// ✅ Correct — module-level singleton
const aiClient: OpenAI | null = env.DEEPSEEK_API_KEY
  ? new OpenAI({ apiKey: env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' })
  : null;

// ❌ Wrong — do NOT do this (recreates HTTP agent on every request)
function getClient() {
  return new OpenAI({ apiKey: env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' });
}
```

**Webhook routes needing raw body** — mount with `express.raw` BEFORE `express.json` in `server/index.ts`. Two routes follow this pattern:
```ts
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);
app.use('/api/daily', express.raw({ type: 'application/json' }), dailyRoutes);
```

### Frontend

**API calls** — use the axios instance from `src/lms/lib/api.ts` (handles base URL + auth headers).

**Data fetching** — TanStack Query v5:
```ts
const { data = [] } = useQuery({
  queryKey: ['key'],
  queryFn: () => api.get<{ data: T[] }>('/endpoint').then(r => r.data.data),
});
```

**Mutations** — always call `qc.invalidateQueries` in `onSuccess`.

**UI components** — import from `src/lms/components/ui/index.tsx`:
```ts
import { Button, Card, CardBody, Badge, Modal, Input, Select, Spinner, EmptyState } from '../../components/ui';
```
Available Badge variants: `default | success | warning | danger | info | purple`

**Toast notifications** — use `sonner`:
```ts
import { toast } from 'sonner';
toast.success('Done'); toast.error('Failed');
```

**Auth state** — Zustand store:
```ts
const { user } = useAuthStore();
const isAdmin = user?.role === 'ADMIN';
const isStaff = user?.role === 'ADMIN' || user?.role === 'TEACHER';
```

**Logout / account switching** — all three logout paths (sidebar button, auth initializer, 401 interceptor) must call `queryClient.clear()` before `clearAuth()`. Failing to do so leaves the previous user's cached data visible to the next user. See `src/lms/lib/api.ts`, `LMSSidebar.tsx`, and `LMSLayout.tsx`.

**Meeting provider** — read from public settings, not hardcoded:
```ts
const { data: publicSettings } = useQuery({ queryKey: ['settings-public'], ... });
const isGoogleMeet = publicSettings?.meeting_provider === 'google_meet';
const isDailyCo    = publicSettings?.meeting_provider === 'daily_co';
```

---

## Role access model

| Feature | ADMIN | TEACHER | STUDENT |
|---|:---:|:---:|:---:|
| User management (`/users`) | ✓ | — | — |
| Settings / Audit Logs | ✓ | — | — |
| Create sessions | ✓ | ✓ | — |
| Students page | ✓ | ✓ | — |
| Mark lessons complete (on behalf of student) | ✓ | ✓ | — |
| View own progress | ✓ | ✓ | ✓ |
| Chat | ✓ | ✓ | ✓ |
| Update student grade | ✓ | — | — |
| Payments — generate links, plans, cancel | ✓ | — | — |
| View own payments | — | — | ✓ |
| Create/manage recitation sessions | ✓ | ✓ (own only) | — |
| Log page attempts + Tajweed errors | ✓ | ✓ (own sessions) | — |
| View recitation sessions list | ✓ (all) | ✓ (own) | ✓ (own) |
| View own Quran progress map | ✓ | ✓ | ✓ |
| View any student's recitation progress | ✓ | ✓ (linked students only) | — |
| Recitation analytics overview | ✓ | ✓ | — |
| Delete recitation session (empty only) | ✓ | — | — |

---

## Environment variables

| Variable | Required | Default | Notes |
|---|:---:|---|---|
| `DATABASE_URL` | ✓ | — | Postgres connection string |
| `JWT_SECRET` | ✓ | — | Min 16 chars |
| `JWT_REFRESH_SECRET` | ✓ | — | Min 16 chars |
| `JWT_EXPIRES_IN` | | `2h` | Access token TTL (docker-compose default is `2h`) |
| `JWT_REFRESH_EXPIRES_IN` | | `7d` | Refresh token TTL |
| `ZOOM_ACCOUNT_ID` | ✓ | — | Zoom Server-to-Server OAuth (shared fallback account) |
| `ZOOM_CLIENT_ID` | ✓ | — | S2S app client ID |
| `ZOOM_CLIENT_SECRET` | ✓ | — | S2S app client secret |
| `ZOOM_OAUTH_CLIENT_ID` | | — | General OAuth app — enables per-teacher Zoom connect |
| `ZOOM_OAUTH_CLIENT_SECRET` | | — | General OAuth app client secret |
| `ZOOM_REDIRECT_URI` | | — | OAuth callback URL (e.g. `https://quranacademy.com/api/zoom/callback`) |
| `DEMO_MODE` | | `false` | Set `true` in demo Doppler config — shows quick-login buttons on `/lms/login` |
| `CLIENT_URL` | | `http://localhost:3000` | CORS origin |
| `PORT` | | `4000` | API server port |
| `DEEPSEEK_API_KEY` | | — | AI features disabled if absent |
| `STRIPE_SECRET_KEY` | | — | Stripe secret key — payments disabled if absent (`sk_test_…` for test/demo, `sk_live_…` for prod) |
| `STRIPE_WEBHOOK_SECRET` | | — | Stripe webhook signing secret (`whsec_…`); required for the payment webhook to verify events |
| `SMTP_HOST/PORT/USER/PASS/FROM` | | — | Emails logged to console if absent |
| `R2_ENDPOINT` | | — | Cloudflare R2 S3-compatible endpoint (e.g. `https://<account-id>.r2.cloudflarestorage.com`) — recordings disabled if absent |
| `R2_REGION` | | `auto` | R2 region (always `auto` for Cloudflare R2) |
| `R2_ACCESS_KEY_ID` | | — | R2 API token access key ID |
| `R2_SECRET_ACCESS_KEY` | | — | R2 API token secret |
| `R2_BUCKET_NAME` | | — | R2 bucket name; bucket must be **private** (no public access) |
| `GOOGLE_CLIENT_ID` | | — | Google OAuth2 client ID — Google Meet disabled if absent |
| `GOOGLE_CLIENT_SECRET` | | — | Google OAuth2 client secret |
| `GOOGLE_REDIRECT_URI` | | — | OAuth callback URL (e.g. `https://quranacademy.com/api/google/callback`) |
| `DAILY_API_KEY` | | — | Daily.co REST API key — `daily_co` meeting provider disabled if absent. Register a webhook in the Daily.co dashboard pointing to `POST /api/daily/webhook`. |

---

## Database notes

- **Postgres 16** via Docker (`docker compose up -d postgres`)
- Migrations live in `prisma/migrations/` — never edit them manually
- `grade` field on `User` and `Subject` uses values: `"Kindergarten"`, `"Grade 1"`…`"Grade 12"`, `"Upskill"`, or `null` (all grades)
- `isActive` on `User` = soft delete; all list queries must filter `{ isActive: true }`
- `Quiz.questions` and `QuizSubmission.answers` are stored as Prisma `Json` columns (typed arrays at runtime)
- `QuizSubmission` has a compound unique `@@unique([quizId, studentId])` — one submission per student per quiz
- `Post.faqs` is a Prisma `Json` column holding a `[{ q, a }]` array; `Post.slug` is unique and `Post.publishedAt` drives public ordering + sitemap
- `QuranPage` and `TajweedRule` are **reference data** — seeded once, never wiped by `prisma/seed.ts`. If they are missing, all recitation routes will 404. Run `pnpm db:seed:quran` to restore them.
- `PageAttempt` is **append-only** — never updated after creation. Current page status is derived from the `student_page_progress` materialized view which reads the latest attempt per `(studentId, pageNumber)`.
- `student_page_progress` is a **PostgreSQL materialized view** — not a Prisma model. Refreshed via `SELECT refresh_student_page_progress()` called asynchronously after session COMPLETED and after any attempt PATCH. Uses quoted camelCase column names (e.g. `"pageNumber"`) because Prisma creates columns that way. Any future raw SQL against this view must use quoted names.
- `RecitationSession` FK relations to `User` use Prisma's default `onDelete: Restrict` — `PageError → PageAttempt → RecitationSession` must be deleted before their parent `User` rows. `prisma/seed.ts` `wipeDatabase()` handles this in the correct order.
- `Session.dailyRoomName` — stores the Daily.co room name when `daily_co` provider is active. Used by the webhook to match incoming recordings to sessions.

---

## AI integration

**DeepSeek** (`deepseek-chat` via OpenAI-compatible SDK) is used for:
- Quiz / exam question generation (`POST /api/quiz/generate`)
- AI grading of submissions (`POST /api/quiz/:id/submit` → synchronous)
- Manual regrade (`POST /api/quiz/:id/submissions/:sid/regrade`)
- Curriculum generation (`POST /api/curriculum-generator/generate`)
- Teaching assistant chat (`POST /api/assistant/chat`, streaming)

All AI routes check `if (!aiClient) return errorResponse(res, 'AI service not configured', 503)` when `DEEPSEEK_API_KEY` is unset.

---

## Meeting providers

Three video platforms are supported. Only one can be active at a time — controlled by the `meeting_provider` Setting in the DB. Admins switch via Settings → Meeting Platform. Default: `zoom`.

| Provider | Setting value | How links are generated | Auto-recording |
|---|---|---|---|
| Zoom | `zoom` | Zoom S2S OAuth API | ❌ Manual upload |
| Google Meet | `google_meet` | Google Calendar OAuth (per-teacher) | ❌ Manual upload |
| Daily.co | `daily_co` | Daily.co REST API (`POST /rooms`) | ✅ Cloud → R2 via webhook |

**Daily.co auto-recording flow:**
1. Session created → `createDailyRoom()` → room URL stored in `Session.zoomJoinUrl`, room name in `Session.dailyRoomName`
2. Call ends → Daily fires `recording.ready` webhook to `POST /api/daily/webhook`
3. Server verifies HMAC signature, downloads MP4 from Daily CDN, uploads to R2 via `uploadBufferToR2`
4. `Session.recordingUrl` updated → existing download UI works automatically

The webhook endpoint uses `express.raw` (same pattern as Stripe) so HMAC verification gets the raw body.

---

## Blog (server-rendered, for SEO/GEO)

The public blog is **server-rendered by Express**, NOT the React SPA. This is deliberate: the SPA serves the same empty `index.html` for every route, so crawlers and AI models would see no content. The blog instead emits complete HTML + per-post meta tags + JSON-LD so pages are indexable and citable.

- **Model:** `Post` (`prisma/schema.prisma`) — Markdown `content`, `slug` (unique), `status` (`DRAFT`/`PUBLISHED`), `publishedAt`, `tags[]`, `faqs` (JSON `[{q,a}]`), SEO fields (`metaTitle`, `metaDescription`, `keywords`, `coverImage`), optional `author` relation + `authorName` fallback.
- **Rendering:** `server/blog/render.ts` — `renderListPage`, `renderPostPage` (emits `BlogPosting` + `BreadcrumbList` + optional `FAQPage` JSON-LD), `renderSitemap`, `renderRss`. Markdown→HTML via `marked`.
- **SSR routes** (in `server/index.ts`, registered BEFORE the SPA catch-all): `GET /blog`, `GET /blog/rss.xml`, `GET /blog/:slug`, and a dynamic `GET /sitemap.xml` (replaces the old static `public/sitemap.xml`). Order matters — `/blog/rss.xml` must precede `/blog/:slug`.
- **API** (`server/routes/blog.routes.ts`): public `GET /api/blog` (paginated published) + `GET /api/blog/:slug`; admin `GET /api/blog/admin/all`, `POST /api/blog`, `PUT /api/blog/:id`, `DELETE /api/blog/:id` (ADMIN/TEACHER; delete is ADMIN-only). Slugs auto-derive from the title and are de-duplicated. `publishedAt` is set the first time `status` becomes `PUBLISHED`.
- **Nav links** to `/blog` in `Navbar.tsx`/`Footer.tsx` are plain `<a href>` (full page load), NOT react-router `<Link>` — the blog is not a SPA route.
- **Note:** post Markdown is authored by trusted roles (ADMIN/TEACHER) and rendered without HTML sanitization; if untrusted authoring is ever added, sanitize `marked` output first.

---

## Content engine (automated blog drafting via n8n)

An external **n8n workflow** ("Quran Academy Content Engine") drafts SEO/GEO blog posts twice a week with Claude and publishes them through this app's blog API after an emailed Approve/Reject gate. This app owns the **topic queue** and the endpoints the workflow drives; the workflow itself and the marketing strategy live in the separate `buildaiwithus-marketing` repo (which has its own `CLAUDE.md`).

- **Model:** `BlogTopic` (`prisma/schema.prisma`) — the queue. Fields: `topicTitle`, `seoKeyword`, `geoQuery`, `cluster`, `intent`, `priority` (`P1`/`P2`/`P3`, claimed ascending), `status` (`enum TopicStatus { QUEUED DRAFTING DRAFTED PUBLISHED ERROR }`), `notes`, `lastError`, `postId` (1:1 → `Post`, inverse relation `Post.topic`), `draftedAt`. Migration: `prisma/migrations/20260530040000_add_blog_topic_queue/`.
- **Routes:** `server/routes/blog-topics.routes.ts`, mounted at `/api/blog/topics` in `server/index.ts` **BEFORE** `/api/blog` (so `/topics` isn't captured by `GET /api/blog/:slug`). All ADMIN/TEACHER:
  - `GET /api/blog/topics?status=QUEUED` — list (optional status filter).
  - `POST /api/blog/topics/claim-next` — **atomically** claims the highest-priority `QUEUED` topic (flips it to `DRAFTING`) via `UPDATE … WHERE id = (SELECT … ORDER BY priority, createdAt LIMIT 1 FOR UPDATE SKIP LOCKED)`. Returns `{data: topic|null}`; `null` when the queue is empty.
  - `PATCH /api/blog/topics/:id` — workflow reports progress (`status`, `postId`, `lastError`). Schema: `UpdateTopicSchema` in `server/schemas/validation.schemas.ts`.
- **Service account:** the workflow logs in (`POST /api/auth/login`) as a dedicated **"Content Bot"** user (role **TEACHER** — least-privilege; can create/update posts, not delete). Drafts are created as `status: DRAFT` with `authorName: "Build AI With Us"`; publish flips them to `PUBLISHED` via `PUT /api/blog/:id`.
- **Idempotency:** comes from `BlogTopic.status`, NOT the slug — `uniqueSlug()` never errors (it would silently create `-2` duplicates), so the atomic claim + status transitions are what prevent double-drafting/publishing.
- **Seed:** `prisma/seed-content-engine.ts` (`npm run db:seed:content-engine`) is **idempotent and non-destructive** (unlike `seed.ts`, which WIPES the DB). It upserts the Content Bot (env `CONTENT_BOT_EMAIL` / `CONTENT_BOT_PASSWORD`) and the P1 topic queue, auto-linking an already-published Article #1 if present.
- **Deploy:** `npx prisma migrate deploy` → `CONTENT_BOT_PASSWORD=… npm run db:seed:content-engine` → redeploy.

---

## Payments (Stripe)

Admins generate Stripe payment links per student (one-time or subscription), email them, and the portal updates payment status automatically via webhook. **Feature-flagged off** when `STRIPE_*` env vars are unset — the app boots fine, every admin payment route 503s, and the frontend hides the flow (mirrors the `DEEPSEEK_API_KEY` / `ZOOM_OAUTH_*` pattern).

- **Models** (`prisma/schema.prisma`): `Plan` (reusable name/amount/currency/type) and `Payment` (per-student). Money is stored as **integer minor units (cents)** everywhere — divide by 100 only for display. `Payment.amount`/`currency` are **snapshotted** at creation so later `Plan` edits never rewrite history. Enums: `PaymentType { ONE_TIME SUBSCRIPTION }`, `PaymentStatus { PENDING PAID PAST_DUE FAILED EXPIRED ENDED CANCELLED }` (`PAST_DUE` = a subscription renewal charge failed and Stripe is retrying via dunning). The `@unique` `stripeSessionId` / `stripeSubscriptionId` columns are the webhook idempotency anchors. Migrations: `20260601072605_add_stripe_payments`, `20260601110713_add_payment_past_due_status`.
- **Service** (`server/services/stripe.service.ts`): one module-level guarded client (`stripe = env.STRIPE_SECRET_KEY ? new Stripe(...) : null`). Helpers: `createCheckoutSession` (one-time `mode:'payment'` / recurring `mode:'subscription'`), `scheduleSubscriptionCancel`, `cancelSubscription`, `constructWebhookEvent`.
- **Subscriptions are created on Stripe automatically** — generate-link makes a Checkout Session; when the student pays, **Stripe creates the real recurring subscription**. No manual subscription creation. For an admin end date, Stripe Checkout's `subscription_data` does **not** accept `cancel_at`, so the webhook sets it on the subscription *after* it exists (via `scheduleSubscriptionCancel` on `checkout.session.completed`).
- **Routes** (`server/routes/payments.routes.ts`, mounted at `/api/payments`): `GET /status` (feature flag), plans CRUD (`POST/GET /plans`, `PATCH /plans/:id`), `POST /` (generate link — active-student guard, plan-or-custom amount), `GET /` (admin all), `GET /me` (student's own only), `POST /:id/email`, `POST /:id/cancel` (early-cancel a subscription). All admin routes are `requireRole(Role.ADMIN)`; `/me` is any authed user filtered to `req.user.userId`.
- **Webhook** (`POST /api/payments/webhook`): **mounted in `server/index.ts` with `express.raw` BEFORE the global `express.json()`** — Stripe signature verification needs the raw body. This ordering is critical; if json parses first, every signature check fails. The handler is **idempotent** (looks up by Stripe id, no-ops if already in a terminal state) and handles `checkout.session.completed`→PAID (only from PENDING; + schedule `cancel_at`), `invoice.paid`→PAID (renewals, from PENDING/PAST_DUE), `invoice.payment_failed`→PAST_DUE (renewal charge failed, from PAID), `customer.subscription.deleted`→ENDED (unless already in a terminal state — e.g. an admin early-cancel CANCELLED wins), `checkout.session.expired`→EXPIRED, `payment_intent.payment_failed`→FAILED. Unknown ids return 200 to stop Stripe retrying. The pure transition logic lives in `server/services/payment-webhook.logic.ts` (`decideTransition`) — the handler delegates to it so the unit-tested logic IS the production logic.
- **Frontend:** admin page `src/lms/pages/payments/Payments.tsx` at `/lms/payments` (Payments + Plans tabs, ADMIN-only); students see their own payments on a dedicated top-level page `src/lms/pages/payments/MyPayments.tsx` at `/lms/my-payments` (standalone sidebar item, STUDENT-only — `GET /payments/me`). Stripe `success_url`/`cancel_url` point at `/lms/my-payments` (student-accessible), NOT the admin-only `/lms/payments`.
- **Secrets:** `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` live in Doppler. **demo → test keys** (`sk_test_…`), **prd → live keys** (`sk_live_…`, set only when launching). Each environment needs its **own Stripe webhook endpoint** registered (the webhook secret is per-endpoint). Both vars are in `docker-compose.{prod,demo}.yml` with `:-` defaults so the app boots when unset.

---

## File uploads

Three Multer upload instances are defined in `server/middleware/upload.middleware.ts`:

| Instance | Directory | Max size | Allowed types |
|---|---|---|---|
| `quizUpload` | `uploads/quiz-submissions/` | 10 MB | PDF, Word, JPG, PNG |
| `lessonUpload` | `uploads/lesson-attachments/` | 50 MB | PDF, Word, PowerPoint, Excel, images, MP4, MP3, TXT, ZIP |

The `/uploads` static route requires a valid access token (enforced via `authenticate` middleware in `server/index.ts`).

Session recordings use a **presigned URL direct-upload** pattern — the browser PUTs the MP4 directly to Cloudflare R2, bypassing the server entirely. The flow:
1. Frontend calls `GET /api/sessions/:id/recording/upload-url` → server returns a presigned PUT URL + object key (valid 1 hour)
2. Browser XHRs the file directly to R2 with upload progress tracking
3. Frontend calls `POST /api/sessions/:id/recording/confirm` with the key → server saves it to `Session.recordingUrl`

When **Daily.co** is the active provider, recordings are pushed to R2 server-side via the webhook (no browser upload involved). `uploadBufferToR2` in `r2.service.ts` handles this path.

The stored `Session.recordingUrl` is the plain R2 object key (e.g. `recordings/<sessionId>/<uuid>.mp4`). Downloads proxy through the server (`GET /api/sessions/:id/recording/download`) since the bucket is private.

Lesson attachment metadata is stored as a JSON array in `Lesson.resources`:
```ts
// LessonAttachment shape stored in Lesson.resources
{ id: string; filename: string; originalName: string; mimeType: string; size: number; url: string; uploadedAt: string }
```

---

## Key API endpoints (non-obvious ones)

| Method | Path | Role | Notes |
|---|---|---|---|
| `PATCH` | `/api/users/:id/grade` | ADMIN | Updates a student's grade level; validates target is STUDENT role |
| `POST` | `/api/curriculum/lessons/reorder` | ADMIN, TEACHER | Reorder lessons within one week; body `{ weekId, lessonIds[] }`. Two-phase update (park at negative offsets, then 0..n) to respect `@@unique([weekId, order])`. Week-scoped — cannot move a lesson across weeks |
| `POST` | `/api/curriculum/lessons/:id/attachments` | ADMIN, TEACHER | Upload file; appends to `Lesson.resources` JSON array |
| `DELETE` | `/api/curriculum/lessons/:id/attachments/:attachmentId` | ADMIN, TEACHER | Removes one attachment from resources array |
| `GET` | `/api/curriculum/progress/:userId` | Auth | Student can only fetch own progress; staff can fetch any |
| `POST` | `/api/curriculum-generator/generate` | ADMIN | AI generates week/lesson structure; returns preview, not saved |
| `POST` | `/api/curriculum-generator/create` | ADMIN | Saves generated curriculum to DB in a single transaction |
| `POST` | `/api/quiz/:id/submissions/:sid/regrade` | ADMIN, TEACHER | Re-runs AI grading on an existing submission |
| `POST` | `/api/payments` | ADMIN | Generate a Stripe payment link; resolves amount from a `Plan` or custom; guards target is an active STUDENT |
| `GET` | `/api/payments/me` | Auth | A student's own payments only (`studentId = req.user.userId`) |
| `POST` | `/api/payments/:id/cancel` | ADMIN | Cancel a subscription early — Stripe stops future charges; status → CANCELLED |
| `POST` | `/api/payments/webhook` | Public (Stripe sig) | Mounted with `express.raw` before `express.json`; verifies signature; idempotent status updates |
| `GET` | `/api/sessions/:id/recording/upload-url` | ADMIN, TEACHER | Returns a presigned R2 PUT URL + key for direct browser upload; teacher-only-own-sessions guard |
| `POST` | `/api/sessions/:id/recording/confirm` | ADMIN, TEACHER | Saves R2 key to DB after browser finishes PUT; validates key prefix matches session id; replaces any previous recording |
| `GET` | `/api/sessions/:id/recording/download` | Auth | Proxy-streams MP4 from R2 to client. Registered **before** `router.use(authenticate)` — accepts `?token=<jwt>` for browser `<a download>` links that can't set headers. Student must be attendee or group member |
| `DELETE` | `/api/sessions/:id/recording` | ADMIN, TEACHER | Removes recording from R2 and clears `Session.recordingUrl` |
| `POST` | `/api/daily/webhook` | Public (Daily HMAC) | Mounted with `express.raw`; verifies HMAC-SHA256; on `recording.ready` downloads MP4 from Daily CDN → uploads to R2 → saves `recordingUrl` |
| `GET` | `/api/recitation/pages` | Auth | All 604 Madani Mushaf pages ordered by `pageNumber`; `staleTime: Infinity` on client — never changes |
| `GET` | `/api/recitation/rules` | Auth | All 20 Tajweed rules ordered by category — used to populate error-logging dropdowns |
| `POST` | `/api/recitation/sessions` | ADMIN, TEACHER | Create a scheduled recitation session for a student; validates student is active |
| `GET` | `/api/recitation/sessions` | Auth | ADMIN: all sessions; TEACHER: own only; STUDENT: own only. `?status=` filter validated against enum |
| `PATCH` | `/api/recitation/sessions/:id` | ADMIN, TEACHER (own) | Update status/notes/timing. `→ COMPLETED` fires async MV refresh (non-blocking) |
| `DELETE` | `/api/recitation/sessions/:id` | ADMIN | Hard delete — **blocked if session has any attempts** (returns 400) |
| `POST` | `/api/recitation/sessions/:id/attempts` | ADMIN, TEACHER (own) | Log a page attempt with optional Tajweed errors. Blocked on COMPLETED/CANCELLED sessions |
| `PATCH` | `/api/recitation/attempts/:attemptId` | ADMIN, TEACHER (own) | Correct status/score/notes on an attempt. Blocked on CANCELLED sessions; fires async MV refresh |
| `GET` | `/api/recitation/progress/:studentId` | Auth | Reads `student_page_progress` materialized view — 604-row map for a student. STUDENT: own only; TEACHER: linked students only |
| `GET` | `/api/recitation/progress/:studentId/summary` | Auth | Aggregated stats: status breakdown, juz breakdown, top 5 errors, needs-review list. Same auth scoping as above |
| `GET` | `/api/recitation/progress/:studentId/page/:n` | Auth | Full attempt history for one student on one page (1–604). Same auth scoping |

---

## Testing

### Unit tests (Vitest)

- **Framework:** Vitest — fast, no servers/DB/Stripe keys needed. Run with `pnpm test:unit` (or `test:unit:watch`).
- **Scope:** `server/**/*.test.ts` only (configured in `vitest.config.ts`), so it never collides with the Playwright E2E specs in `tests/` (those are `*.spec.ts`).
- **What's covered:** the Stripe payment state machine (`server/services/payment-webhook.logic.test.ts` — every status transition, idempotency, terminal-state protection, PAST_DUE handling, CANCELLED-vs-ENDED reconciliation), the plan/payment Zod schemas (`server/schemas/payment.schemas.test.ts`), and the Checkout return URLs (`server/services/payment-urls.test.ts` — students land on `/lms/my-payments`, never the admin page).
- **Pattern:** webhook/URL decision logic is extracted into pure functions (`decideTransition`, `checkoutReturnUrls`) that the real handlers delegate to — so the tested logic IS the production logic. When changing payment behaviour, update the pure function + its test, not a copy.

### E2E tests (Playwright)

- **Framework:** Playwright 1.60 (TypeScript)
- **Auth setup:** `tests/auth.setup.ts` runs first and saves session state for admin, teacher, and student into `.auth/` files — all subsequent specs use `storageState` to skip login
- **Seed dependency:** Tests assume the seed data is present. Run `pnpm db:seed` before testing (this also seeds Quran reference data automatically)
- **Clean up:** Run `npx tsx scripts/cleanup-playwright-data.ts` after any test run to remove Playwright-created records
- **Numbering:** Specs are numbered `01`–`15`; run in that order via `pnpm test`
- **Recitation not yet covered** — the recitation system (`/lms/recitation/*`) has no E2E specs yet. When adding them, number as `16-recitation.spec.ts` and seed at least one teacher–student session pair in `auth.setup.ts` or a spec-level `beforeAll`.

Common gotchas:
- Use `.first()` on locators when multiple elements match to avoid Playwright strict-mode errors
- `getByText(x, { exact: true })` when a label appears inside longer text
- The heading in the Users page is "User Management", not "Users"
- Teacher progress page heading is "Student Progress"; student progress page heading is "My Progress"
- Sidebar and page headings say "Courses" (not "Subjects") — renamed in this codebase

---

## Deployment environments

Two live environments run the **same Docker image** on the same VPS, differing only in Doppler config:

| | Production | Demo |
|---|---|---|
| URL | https://quranacademy.com | https://demo.quranacademy.com |
| Container | `quranacademy-app` | `quranacademy-demo` |
| Port | `127.0.0.1:4002` | `127.0.0.1:4003` |
| Database | `quranacademy` | `quranacademy_demo` |
| Doppler config | `prd` | `demo` |
| Seed on deploy | ❌ Never | ✅ Always (wipe + reseed) |

**CI/CD flow:**
1. Push to `main` → `deploy.yml` builds image + deploys prod (migrations only, **no seed**)
2. Demo deploy is **manual only** — go to Actions → 🎭 Deploy Demo Environment → Run workflow
3. Manual reseed available any time via `seed-demo.yml` workflow in the GitHub Actions tab
4. Production DB reset (wipe + single admin) via `seed-db.yml` workflow — use with extreme care

**Critical rules:**
- `prisma/seed.ts` is **destructive** (wipes all tables before inserting). Never run it against the production database. The CI never does this — only `seed-demo.yml` and manual developer runs.
- `scripts/reset-prod.ts` is also **destructive** — it wipes all production data and creates a single admin account. Only run via the `seed-db.yml` workflow when a full production reset is explicitly needed.
- Production migrations run via `prisma migrate deploy` (forward-only, non-destructive).
- Both environments are fully isolated: separate databases, separate Docker volumes (`uploads_data` vs `demo_uploads_data`), separate Doppler tokens.

**SSH deploy fallback:** GitHub Actions runners occasionally get assigned IPs that the VPS firewall blocks, causing `dial tcp :22: i/o timeout`. The Docker image still builds and is pushed to GHCR successfully. When this happens, deploy manually from any machine with VPS SSH access:
```bash
ssh root@72.62.248.248
cd /docker/aitechservices-n8n
echo "<ghcr-token>" | docker login ghcr.io -u muddsarn8n --password-stdin
docker compose pull quranacademy
docker compose up -d --no-deps quranacademy
curl -sf http://localhost:4002/api/health
```
Get a GHCR token from `gh auth token` locally, or from GitHub → Settings → Developer settings → Personal access tokens (needs `read:packages` scope). Alternatively just rerun the failed workflow — a different runner IP may succeed.

See `DEPLOY.md` for the full setup guide.

---

## Security & architecture notes

### Access token storage
`accessToken` is kept **in-memory only** (Zustand state, not localStorage). On every page reload, `LMSLayout`'s `AuthInitializer` calls `/auth/refresh` to re-issue a fresh token from the httpOnly refresh cookie before any page component mounts. This prevents XSS from reading the token out of `localStorage`.

### Socket authentication
The Socket.IO client uses `reconnectSocket()` (exported from `src/lms/lib/socket.ts`) — called by `AuthInitializer` after the fresh token is set. The socket does not auto-connect until a valid token is available. All three logout paths (sidebar button, 401 interceptor in `api.ts`, `AuthInitializer` catch) call `disconnectSocket()` before `clearAuth()` to prevent socket leakage across account switches.

### Async error handling
`express-async-errors` is installed and imported at the top of `server/index.ts`. This patches Express 4 so unhandled async rejections in route handlers are forwarded to the error middleware rather than crashing the Node 18+ process.

### Rate limiting
The global `rateLimit` in `server/index.ts` keys by `req.ip`. Note: `req.user` is always `undefined` at this layer because `authenticate` runs at router level, not app level — so the "per-user key" comment in the code is incorrect. 500 req/15min per IP applies. Users behind NAT share a bucket.

### Recurring session Zoom links
`createZoomMeeting` is called **sequentially** (not `Promise.all`) for recurring sessions to avoid Zoom API rate-limit bursts that would silently drop meeting links for some dates.

### Docker resource limits & log rotation
Both `docker-compose.prod.yml` and `docker-compose.demo.yml` have:
- `deploy.resources.limits`: `cpus: 1.5`, `memory: 1G` — prevents OOM from killing Postgres
- `logging`: `json-file`, `max-size: 50m`, `max-file: 5` — prevents unbounded log growth filling the host disk

### DB connection pool
`?connection_limit=20&pool_timeout=30` is baked into `DATABASE_URL` in both compose files. This overrides Prisma's default formula (`2 × CPU + 1 = 5` on the 2-vCPU VPS).

---

## Quran Recitation system

The core feature of this LMS. Teachers log Quran recitation sessions page-by-page; the system tracks student progress across all 604 pages of the Madani Mushaf.

### Data model

Five models in `prisma/schema.prisma`:

| Model | Purpose |
|---|---|
| `QuranPage` | Reference data — 604 rows, one per Madani Mushaf page. Fields: `pageNumber` (PK), `juzNumber`, `hizbNumber`, `surahNumber`, `surahNameEn`, `surahNameAr`, `ayahStart`, `isStartOfSurah`. Seeded once, never wiped. |
| `TajweedRule` | Reference data — ~20 rows. String PK (e.g. `"IKHFA"`), `nameEn`, `nameAr`, `category` (enum), `description`. |
| `RecitationSession` | One session per teacher–student meeting. Status: `SCHEDULED → IN_PROGRESS → COMPLETED / CANCELLED`. |
| `PageAttempt` | **Append-only event log** — one row per page worked in a session. Never updated. `status` (`INTRODUCED / PRACTICING / COMPLETED / NEEDS_REVIEW`), `masteryScore` (0–100), `teacherNotes`. Denormalized `studentId` + `teacherId` for query efficiency. |
| `PageError` | Normalized Tajweed errors per attempt — FK to `TajweedRule`, `severity` (MINOR / MODERATE / MAJOR). Cascade-deletes with its `PageAttempt`. |

### Materialized view: `student_page_progress`

Defined in `prisma/migrations/20260611000000_add_quran_recitation/migration.sql`. Pre-aggregates the latest attempt status + mastery per `(studentId, pageNumber)` pair across all sessions.

- Refreshed **asynchronously** (fire-and-forget) after `RecitationSession → COMPLETED` and after any `PATCH /attempts/:id`
- Uses `REFRESH MATERIALIZED VIEW CONCURRENTLY` — requires the unique index `spp_student_page_uidx`
- **All column names are quoted camelCase** — e.g. `"pageNumber"`, `"studentId"`. Any raw SQL against this view must quote them.
- Read via `prisma.$queryRaw` template literal (Prisma does not model views). Returns `BigInt` for `COUNT` columns — convert with `Number()` before JSON serialization.

### Route file

`server/routes/recitation.routes.ts` — mounted at `/api/recitation` in `server/index.ts`.

Key authorization rules enforced in the routes (not just frontend):
- TEACHER can only read progress summaries for students they have **at least one session with**
- TEACHER can only PATCH attempts in **their own sessions**
- STUDENT can only see their own sessions and their own progress
- `DELETE /sessions/:id` returns 400 if the session has any attempts (prevents FK crash)
- `?status=` filter on `GET /sessions` is validated against the enum before reaching Prisma

### Frontend pages

All under `src/lms/pages/recitation/`:

| File | Route | Who sees it |
|---|---|---|
| `RecitationSessions.tsx` | `/lms/recitation` | ADMIN, TEACHER |
| `RecitationSessionView.tsx` | `/lms/recitation/:id` | ADMIN, TEACHER (own) |
| `StudentRecitationView.tsx` | `/lms/recitation/student/:studentId` | ADMIN, TEACHER |

Quran progress for students is accessed via the **Courses** page (`/lms/subjects/quran-with-tajweed`) — `QuranProgress.tsx` handles both staff (student picker) and student (own progress) views. `MyQuranProgress` and `RecitationAnalytics` have been removed; their functionality is consolidated into `QuranProgress.tsx`.

`MushaafGrid.tsx` — shared 604-button grid component. Status colours: sky=INTRODUCED, amber=PRACTICING, emerald=COMPLETED, red=NEEDS_REVIEW, white=not started. Juz filter + status filter buttons built in.

`QuranPageModal.tsx` (`src/lms/components/ui/`) — full-page Quran image viewer with zoom, prev/next navigation, and teacher row-highlight overlay. `allowHighlight` prop gates write access (toolbar + click handler); highlight renders for all viewers. Highlight is client-side only (not persisted). Band height = 5.5% of image height (`HIGHLIGHT_HEIGHT_FRAC = 0.055`), centered on the clicked Y position.

### Sessions page (`src/lms/pages/sessions/Sessions.tsx`)

The general sessions page (`/lms/sessions`) handles scheduling for all course types (not just recitation). Key design decisions:

**Create-session form order:** Student → Course → Teacher/Host
- Staff pick a student first; the course dropdown then filters to only the subjects that student is enrolled in (via `GET /api/users/:id/subjects`)
- `GET /api/users/:id/subjects` is defined in `server/routes/users.routes.ts` — returns `Subject[]` for a student's enrollments; STUDENT can only fetch own
- This prevents accidentally scheduling a session for a course the student isn't enrolled in

**Session card "Continue" button:**
- Each session card shows a "Continue with [student first name]" link for staff
- Navigates to `/lms/subjects/:subjectId?student=:studentId`
- `NooraniQaida.tsx` and `QuranProgress.tsx` detect the `?student=` param and auto-open the student's current lesson/page on arrival (one-shot via `useRef` guard so it only fires once per navigation)

**Progress tracking (no lessonId on Session):**
- Sessions have no `lessonId` — progress is tracked entirely in `LessonProgress` (Noorani Qaida) and `PageAttempt`/`student_page_progress` MV (Quran with Tajweed)
- A student can spend multiple sessions on the same lesson or page; the teacher marks complete when ready

### Core courses

Five stable-ID courses seeded by `scripts/seed-core-courses.ts`:

| ID | Title | Color |
|---|---|---|
| `noorani-qaida-english` | Noorani Qaida (English) | emerald `#059669` |
| `noorani-qaida-urdu` | Noorani Qaida (Urdu) | teal `#0d9488` |
| `quran-with-tajweed` | Quran with Tajweed | blue `#0e91e9` |
| `daily-prayers` | Prayers | violet `#7c3aed` |
| `general-islamic-education` | General Islamic Education | amber `#d97706` |

Noorani Qaida is split into two separate subjects — English-medium pages and Urdu-medium pages — so students enroll in the version that suits their language. Both share the same 6-week, 22-lesson structure but each lesson only contains images in the relevant language.

`scripts/seed-noorani-qaida.ts` seeds both subjects in one run, filtering each lesson's resources by `originalName` ("English" vs "Urdu"). Safe to re-run (`pnpm db:seed:noorani-qaida`).

`NooraniQaida.tsx` uses `useParams()` to read the subject ID dynamically — the same component serves both courses. `SubjectDetail.tsx` routes `noorani-qaida-english` and `noorani-qaida-urdu` to it.

### Seeding

`scripts/seed-quran-data.ts` — idempotent, uses `createMany({ skipDuplicates: true })` for the 604 page rows (fast batch insert). Called automatically at the end of `prisma/seed.ts`. Safe to re-run standalone with `pnpm db:seed:quran`.

**If the `QuranPage` table is empty**, all recitation pages will 404 and the Mushaf grid will silently show nothing. Run `pnpm db:seed:quran` to fix.

---

## Known architecture issues (open / not yet fixed)

These are confirmed items needing design decisions before fixing:

1. **Refresh token not rotated on use** — on each `/auth/refresh` call a new access token is issued but the refresh token and its DB hash stay the same. A stolen refresh cookie remains valid for its full 7-day TTL. Rotating (issue new refresh token + invalidate old) limits the blast radius to one use. Password change does not null `User.refreshToken` either.

2. **`staleTime: 60 000` with `refetchOnWindowFocus: false`** (`src/lms/lib/queryClient.ts`) — data in a second tab can be up to 60 s stale. Acceptable trade-off today; revisit if real-time accuracy becomes critical for teachers.

3. **Dead schema columns** (`prisma/schema.prisma`) — `User.resetToken` and `User.resetTokenExpiry` exist but no self-service forgot-password flow is implemented. Either implement the flow or drop the columns in a migration.

4. **Grade strings unvalidated server-side** — `User.grade` and `Subject.grade` accept free text. A mismatch in casing (e.g. `"grade 7"` vs `"Grade 7"`) silently breaks the grade-filter feature. Add a Zod enum check in the relevant route schemas.

5. **Rate limiter key is always IP** — `req.user` is never set at the global middleware layer; all requests key by IP. Students behind a shared school NAT share one bucket. Fix by moving the rate limiter inside protected routers (after `authenticate` runs) or promoting `authenticate` to app-level with public-route passthrough.

6. **`GET /curriculum/:subjectId/progress` unbounded** — returns all `LessonProgress` rows for all students with no pagination. At 400+ students × 200+ lessons this is a multi-MB JSON response on every staff progress load. Add pagination or server-side aggregation.

7. **`GET /api/quiz/:id/submissions` unbounded** — returns full `answers` JSONB for all submissions. Bounded by `@@unique([quizId, studentId])` but grows with cohort size. Add pagination or exclude `answers` from the list view.

8. **`RecitationAnalytics` fires N API calls on mount** — each `StudentRow` component independently calls `GET /recitation/progress/:studentId/summary`. With 100+ students this is 100+ simultaneous requests. Fix: add `GET /api/recitation/progress/all-summaries` batch endpoint, or use an intersection observer to load lazily.

9. **`GET /api/recitation/sessions` has no pagination** — returns all sessions for ADMIN with no `take`/`skip`. Add `?page=&limit=` query params (default `limit: 50`).

10. **`attemptOrder` race condition** — computed as `max + 1` in application code with no DB-level unique constraint on `(sessionId, attemptOrder)`. Two concurrent POSTs to the same session could produce duplicate `attemptOrder` values. Fix: add `@@unique([sessionId, attemptOrder])` to `PageAttempt` or compute inside a transaction.

11. **`student_page_progress` MV uses correlated subqueries** — three correlated subqueries per row inside the view definition. At scale (100 students × 604 pages), `REFRESH CONCURRENTLY` will be slow. Fix: rewrite using window functions (`ROW_NUMBER() OVER (PARTITION BY studentId, pageNumber ORDER BY createdAt DESC)`).

12. **`RecitationSession.zoomSessionId` has no FK constraint** — stored as `String?` with a comment "FK → Session.id" but no actual Prisma relation defined. A dangling reference is undetected at DB level. Either define a proper relation or remove the FK comment.

13. **Student sees teacher notes** — `GET /sessions/:id` returns full attempts including `teacherNotes` to any student who owns the session. Decide whether this is intentional (transparency) or requires a `studentNotes` field / role-based field masking.

14. **`MushaafGrid` renders all 604 buttons unconditionally** — no virtualization. On low-end mobile this causes ~200ms render stall. Consider `react-window` or lazy juz expansion.

15. **Student dropdown in new-session form hard-limited to 200** (`RecitationSessions.tsx` line 69) — academies with >200 active students silently drop the rest. Replace with a server-side searchable combobox.

<!-- cce-block-version: 4 -->
## Context Engine (CCE)

This project uses Code Context Engine for intelligent code retrieval and
cross-session memory.

### Searching the codebase

**You MUST use `context_search` instead of reading files directly** when
exploring the codebase, answering questions about code, or understanding how
things work. This is a hard requirement, not a suggestion. `context_search`
returns the most relevant code chunks with confidence scores instead of whole
files, and tracks token savings automatically.

When to use `context_search`:
- Answering questions about the codebase ("how does X work?", "where is Y?")
- Exploring structure or architecture
- Finding related code, functions, or patterns
- Any time you would otherwise read a file just to understand it

When to use `Read` instead:
- You need to edit a specific file (read before editing)
- You need the exact, complete content of a known file path

Other search tools:
- `expand_chunk` — get full source for a compressed result
- `related_context` — find what calls/imports a function

### Cross-session memory — use it actively

This project has persistent memory across Claude Code sessions. **You must
use it both ways: recall before answering, record after deciding.** Memory
that is not recorded is lost; memory that is not recalled does nothing.

**Before answering a non-trivial question, call `session_recall`.**
Especially when:
- The question touches architecture, design, or naming choices
- The user asks "what / why / how did we ..."
- You are about to recommend an approach the team may have already chosen
  or already rejected

Pass a topic phrase, not a single word — e.g. `session_recall("auth flow")`,
not `session_recall("auth")`. Recall is vector-similarity-based, so paraphrases
match. If recall returns relevant entries, lead with them ("Per a prior
decision: ...") instead of re-deriving the answer.

**After making a non-obvious decision, call `record_decision`.** Especially:
- Choosing one library / pattern / approach over another
- Resolving an ambiguity in the spec or requirements
- Establishing a convention the project should follow going forward
- Anything you would not want to re-litigate next session

Format: `record_decision(decision="...", reason="...")`. Keep both fields
short and specific — they are surfaced verbatim at the start of future
sessions.

**After meaningful work in a file, call `record_code_area`.** Especially when:
- You added or substantially modified a function/class
- You traced through a non-obvious flow and want future-you to find it fast

Format: `record_code_area(file_path="...", description="...")`.

Skip recording for trivial reads, formatting changes, or one-off lookups —
the goal is durable signal, not an event log.

### Drilling deeper from a recall hit

`session_recall` results are tagged with the source session id, e.g.
`[turn sid:abc123|n:5]`. To drill in:

- `session_timeline(session_id="abc123")` — walk the per-turn summaries of
  that session in order. Use this when the user asks "what was the
  reasoning?" or "how did we get there?".
- `session_event(event_id=N)` — fetch a specific tool event's raw input
  and output (capped at 4 KB at read time). Use this when a turn summary
  references a tool result you actually need to inspect.

Both are read-only and cheap. Prefer them over re-running tool calls or
asking the user to re-paste context.

### Output style

Respond in compressed style. Drop articles (a, an, the) in prose. Use
sentence fragments over full sentences. Use short synonyms (fix not resolve,
check not investigate). Pattern: [thing] [action] [reason]. [next step].
No filler, hedging, pleasantries, trailing summaries, or restating what
the user said. One sentence if one sentence is enough.

When suggesting code changes, show only the changed lines with 3 lines of
context. Never rewrite entire files. Multiple changes in one file: show each
change separately. Never echo back unchanged code the user already has.

Code blocks, file paths, commands, error messages: always written in full.
Security warnings and destructive action confirmations: use full clarity.
<!-- /cce-block -->
