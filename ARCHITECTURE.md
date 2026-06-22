# Architecture — Online Quran Academy LMS

High-level system design, data flow, and integration map for the Quran Academy LMS.

---

## System overview

```
Browser
  │
  ├── React SPA (Vite :3000 dev / served by Express in prod)
  │     ├── Public marketing site  (/, /about, /programs, /blog, …)
  │     └── LMS app  (/lms/*)      — JWT auth, TanStack Query, Socket.IO
  │
  └── Express API  (:4000)
        ├── REST API  /api/*
        ├── Server-rendered blog  /blog, /blog/:slug, /sitemap.xml
        ├── Socket.IO (real-time notifications + chat)
        └── Static files  /uploads (auth-gated), /quran-pages (public)
```

In production both the SPA and API run in a single Docker container. Caddy
(on the VPS) terminates TLS and proxies to port 4000.

---

## Request lifecycle

```
Browser request
  → Caddy (TLS termination, www→non-www redirect)
    → Express (port 4000)
      → Helmet, CORS, Morgan logging
      → Raw-body routes first (Stripe webhook, Daily.co webhook)
      → express.json()
      → Rate limiter (500 req/15 min per IP)
      → Route handler
          → authenticate middleware (JWT Bearer)
          → requireRole guard
          → validate middleware (Zod)
          → Prisma query
          → successResponse / errorResponse
      → errorHandler middleware
```

---

## Frontend architecture

```
src/
├── pages/              Public marketing (React Router, no auth)
├── components/         Navbar, Footer, WhatsAppWidget
└── lms/
    ├── components/
    │   ├── layout/     LMSLayout → AuthInitializer (refresh token on mount)
    │   │               LMSSidebar (nav, logout)
    │   ├── auth/       ProtectedRoute (role-aware redirect)
    │   └── ui/         Design system — Button, Card, Badge, Modal, Input,
    │                   Select, Spinner, EmptyState, QuranPageModal
    ├── pages/          One folder per feature area
    │   └── recitation/ MushaafGrid, RecitationSessions, RecitationSessionView,
    │                   MyQuranProgress, RecitationAnalytics, StudentRecitationView
    ├── store/          Zustand (authStore, notificationStore, chatStore)
    ├── lib/
    │   ├── api.ts      axios instance — base URL + auth header injection
    │   │               + 401 interceptor (logout + queryClient.clear)
    │   ├── socket.ts   Socket.IO client — connect/disconnect/reconnect
    │   └── queryClient.ts  staleTime: 60s, refetchOnWindowFocus: false
    └── types/          index.ts — all shared TS interfaces
```

**Auth flow on page load:**
1. `LMSLayout` mounts → `AuthInitializer` calls `POST /api/auth/refresh`
2. New `accessToken` set in Zustand (never in localStorage)
3. `reconnectSocket(token)` — socket handshake with token
4. React Router renders the requested page — queries fire after token is available

---

## Backend architecture

```
server/
├── config/
│   ├── env.ts          Zod-validated env — process exits on first invalid var
│   └── prisma.ts       PrismaClient singleton (one connection pool)
├── middleware/
│   ├── auth.middleware.ts     JWT verify → req.user
│   ├── validate.middleware.ts Zod schema → 400 on failure
│   ├── upload.middleware.ts   Multer instances (quiz, lesson)
│   └── error.middleware.ts    express-async-errors catch-all
├── routes/             One file per resource, all use Router()
│   ├── sessions.routes.ts    Zoom / Google Meet / Daily.co branching
│   ├── recitation.routes.ts  /api/recitation — sessions, attempts, progress MV
│   └── daily.routes.ts       /api/daily/webhook — recording → R2
├── schemas/            Zod schemas (validation.schemas.ts + per-feature files)
├── services/           Thin wrappers around external APIs
│   ├── zoom.service.ts
│   ├── google-meet.service.ts
│   ├── daily.service.ts      createDailyRoom, deleteDailyRoom, downloadRecording, verifyHMAC
│   ├── r2.service.ts         presignedUpload, stream, uploadBuffer, delete
│   ├── stripe.service.ts
│   └── email.service.ts
├── socket/             Socket.IO init + pushNotification helper
└── utils/
    ├── response.utils.ts  successResponse / errorResponse
    ├── jwt.utils.ts       sign / verify access + refresh tokens
    └── audit.utils.ts     fire-and-forget audit log writer
```

**Route mounting order in `server/index.ts` (order matters):**
```
express.raw  →  /api/payments/webhook   (Stripe HMAC — must precede express.json)
express.raw  →  /api/daily              (Daily.co HMAC — must precede express.json)
express.json
...routes...
/api/blog/topics  (before /api/blog — avoids :slug capture)
/api/blog
/api/payments     (after webhook mount)
/uploads          (auth-gated static)
/quran-pages      (public static, 30-day cache)
/api/health
/api              (catch-all 404)
/blog, /blog/rss.xml, /blog/:slug  (SSR, before SPA catch-all)
/sitemap.xml
express.static(dist)  (prod only)
*                (SPA shell or 404)
errorHandler
```

---

## Database schema (key relationships)

```
User ──────────────────────────────────────────────────┐
 │ (ADMIN/TEACHER/STUDENT)                             │
 ├── hosts ──► Session ◄── subject ── Subject          │
 │                └── attendances ── SessionAttendance  │
 ├── teacher ──► RecitationSession ◄── student ────────┤
 │                   └── attempts ── PageAttempt        │
 │                                       └── errors ── PageError ──► TajweedRule
 ├── enrolled ──► SubjectEnrollment ──► Subject         │
 │                   └── weeks ── Week ── Lesson        │
 │                                  └── progress ── LessonProgress
 ├── payments ──► Payment ──► Plan                      │
 ├── submissions ──► QuizSubmission ──► Quiz ──► Subject│
 └── messages ──► ChatMessage ──► ChatRoom ─────────────┘

QuranPage  (604 rows, reference data — never wiped)
TajweedRule (~20 rows, reference data — never wiped)

student_page_progress  ← PostgreSQL materialized view (not a Prisma model)
  Aggregates: latest PageAttempt status + mastery per (studentId, pageNumber)
  Refreshed async after: session COMPLETED, attempt PATCH
```

**Session fields used by meeting providers:**

| Field | Zoom | Google Meet | Daily.co |
|---|---|---|---|
| `zoomMeetingId` | Zoom meeting ID | — | — |
| `zoomJoinUrl` | Join URL | Meet link | Daily room URL |
| `zoomStartUrl` | Host URL | Meet link | Daily room URL |
| `zoomPassword` | Password | — | — |
| `googleCalendarEventId` | — | Calendar event ID | — |
| `dailyRoomName` | — | — | Room name (webhook key) |
| `recordingUrl` | R2 key (manual) | R2 key (manual) | R2 key (auto via webhook) |

---

## Video / recording system

Three meeting providers share the same `Session` fields but follow different recording flows:

```
┌─────────────┬────────────────────────────────────────────────────────┐
│ Provider    │ Recording flow                                         │
├─────────────┼────────────────────────────────────────────────────────┤
│ Zoom        │ Manual: teacher uploads MP4 via browser → presigned    │
│             │ R2 PUT URL → confirm endpoint saves key                │
├─────────────┼────────────────────────────────────────────────────────┤
│ Google Meet │ Manual: same browser-upload flow                       │
├─────────────┼────────────────────────────────────────────────────────┤
│ Daily.co    │ Automatic:                                             │
│             │  1. createDailyRoom() on session create                │
│             │  2. Call ends → Daily fires recording.ready webhook    │
│             │  3. Server downloads MP4 from Daily CDN                │
│             │  4. uploadBufferToR2() → key saved to recordingUrl     │
│             │  No teacher action needed                              │
└─────────────┴────────────────────────────────────────────────────────┘
```

**R2 download path** (all providers):
```
Student clicks download
  → GET /api/sessions/:id/recording/download?token=<jwt>
  → server verifies token + access control
  → getRecordingStream(key) → pipe to response
```

---

## Quran recitation data flow

```
Teacher opens RecitationSessionView
  → loads session + attempts (GET /api/recitation/sessions/:id)
  → MushaafGrid renders 604 page buttons (status from student_page_progress MV)
  → QuranPageModal opens on click (image from /quran-pages/:n.png)
  → teacher clicks a row → amber highlight band (client-side, not persisted)
    allowHighlight=true on teacher, false on student (read-only overlay)

Teacher logs attempt (POST /api/recitation/sessions/:id/attempts)
  → PageAttempt row created (append-only, never updated)
  → optional PageError rows linked to TajweedRule
  → if session status → COMPLETED: async refresh_student_page_progress()

Student views MyQuranProgress
  → GET /api/recitation/progress/:studentId
  → reads student_page_progress MV (604 rows)
  → MushaafGrid renders full Mushaf with colour-coded status:
      white=not started, sky=INTRODUCED, amber=PRACTICING,
      emerald=COMPLETED, red=NEEDS_REVIEW
  → click page → QuranPageModal with attempt history sidebar
```

---

## External integrations

| Service | Purpose | Feature flag | Config |
|---|---|---|---|
| Zoom S2S OAuth | Meeting creation | Always on (placeholders in dev) | `ZOOM_*` |
| Zoom OAuth (per-teacher) | Teacher-linked meetings | Optional | `ZOOM_OAUTH_*` |
| Google Calendar / Meet | Meeting creation + OAuth | Optional | `GOOGLE_*` |
| Daily.co REST API | Room creation + auto-recording | Optional | `DAILY_API_KEY` |
| Cloudflare R2 | Session recording storage | Optional | `R2_*` |
| Stripe | Payments + webhooks | Optional | `STRIPE_*` |
| DeepSeek AI | Quiz gen, grading, curriculum, chat | Optional | `DEEPSEEK_API_KEY` |
| Nodemailer / SMTP | Email notifications | Optional (console fallback) | `SMTP_*` |

All optional integrations follow the same pattern:
- `isDailyConfigured()` / `isR2Configured()` / `aiClient !== null` guard at route level
- Returns `503` if feature is called but not configured
- Frontend hides UI elements when the feature flag is off (via `/api/settings/public`)

---

## Real-time (Socket.IO)

```
Server: initSocketServer(httpServer) — singleton in socket/socket.server.ts
Client: reconnectSocket(token)       — called after auth refresh

Events:
  server → client:  notification  { title, body, type, link }
  server → client:  chat_message  { roomId, message }
  client → server:  join_room     { roomId }
  client → server:  send_message  { roomId, content }
```

Socket rooms are keyed by `userId` for notifications and `roomId` for chat.
The socket disconnects on logout (all three logout paths call `disconnectSocket()`).

---

## AI (DeepSeek)

Single module-level `OpenAI` client pointing at `https://api.deepseek.com`.
Never instantiated per-request (would leak HTTP connection pools).

Flows:
- **Quiz generate** — `POST /api/quiz/generate` → streaming JSON parse → structured questions
- **Quiz grade** — synchronous on submit; also manual regrade endpoint
- **Curriculum** — `POST /api/curriculum-generator/generate` → week/lesson JSON preview (not saved until `/create`)
- **Assistant chat** — `POST /api/assistant/chat` → SSE stream to browser

---

## Blog (SSR for SEO/GEO)

Express renders full HTML for `/blog` and `/blog/:slug` before the SPA catch-all.
This is critical: the React SPA returns an empty `<div id="root">` — crawlers
and AI models (Perplexity, ChatGPT) would see nothing without SSR.

```
/blog         → renderListPage(posts)
/blog/:slug   → renderPostPage(post)   + JSON-LD (BlogPosting + FAQPage)
/sitemap.xml  → renderSitemap(posts)   + static public routes
/blog/rss.xml → renderRss(posts)
```

The n8n content engine drafts posts automatically via the `BlogTopic` queue
and the `Content Bot` service account (TEACHER role).

---

## Deployment topology

```
                    ┌─────────────────────────┐
Internet ──HTTPS──► │ Caddy (VPS, port 443)   │
                    │  TLS + www→non-www       │
                    └──────────┬──────────────┘
                               │ proxy
              ┌────────────────┴────────────────┐
              │                                 │
     ┌────────▼──────────┐           ┌──────────▼────────┐
     │ buildaiwithus-app │           │ buildaiwithus-demo │
     │ port 127.0.0.1:4000│          │ port 127.0.0.1:4001│
     │ Doppler: prd       │          │ Doppler: demo      │
     │ DB: buildaiwithus  │          │ DB: buildaiwithus_demo│
     └────────┬──────────┘           └──────────┬────────┘
              │                                 │
              └──────────────┬──────────────────┘
                             │
                    ┌────────▼────────┐
                    │ PostgreSQL 16   │
                    │ (same VPS)      │
                    └─────────────────┘

External storage:
  Cloudflare R2  ← session recordings (private bucket)
  GitHub Actions ← daily pg_dump backup artifacts (30-day retention)
```

Both environments use the same Docker image, built from `main` by CI.
Demo is always reseeded on deploy; prod runs migrations only.

---

## Courses (formerly Subjects)

The data model uses `Subject` (Prisma model name kept for DB compatibility) but
all frontend UI displays "Course/Courses". Four stable-ID core courses:

| ID | Name | Color |
|---|---|---|
| `noorani-qaida` | Basic Noorani Qaida | emerald `#059669` |
| `quran-with-tajweed` | Quran with Tajweed | blue `#0e91e9` |
| `daily-prayers` | Prayers | violet `#7c3aed` |
| `general-islamic-education` | General Islamic Education | amber `#d97706` |

Seeded idempotently via `scripts/seed-core-courses.ts` and
`scripts/seed-noorani-qaida.ts` (6 weeks, 22 lessons with CDN images).
