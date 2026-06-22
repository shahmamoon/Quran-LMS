# Online Quran Academy — LMS

A full-stack Learning Management System for online Quran teaching: recitation tracking, curriculum management, live sessions, real-time chat, and student progress tracking.

**Live sites:**
- 🌍 Production: [quranacademy.com](https://quranacademy.com)
- 🎭 Demo: [demo.quranacademy.com](https://demo.quranacademy.com)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Express 4 + TypeScript (ESM) |
| Database | PostgreSQL 16 + Prisma ORM |
| Real-time | Socket.IO 4 |
| AI | DeepSeek (`deepseek-chat`) |
| Auth | JWT (httpOnly cookies, access + refresh) |
| Video sessions | Zoom Server-to-Server OAuth |
| Payments | Stripe (Checkout + webhooks) |
| Secrets | Doppler |
| CI/CD | GitHub Actions + Docker + GHCR |
| Reverse proxy | Caddy (auto-SSL via ACME) |

---

## Features

- **User management** — Admin, Teacher, Student roles with role-based access control
- **Curriculum** — Weeks + lessons with rich text content, video links, and file attachments
- **Quran Recitation tracking** — Page-by-page progress across all 604 Madani Mushaf pages with Tajweed error logging and materialized view analytics
- **Noorani Qaida** — 6-week, 22-lesson course with CDN lesson images; full image viewer (zoom, pan, row highlighter)
- **Courses** — Two core courses (Quran with Tajweed, Noorani Qaida); students see only their enrolled courses
- **Student progress** — Lesson completion tracking; teacher dashboard with per-student breakdown
- **Sessions** — 1-on-1 live sessions via Zoom, Google Meet, or Daily.co (one provider active at a time)
- **Payments** — Stripe payment links per student (one-time or subscription); admin generates + emails links, status updates via webhook
- **Chat** — Real-time messaging between teachers and students (Socket.IO)
- **Notifications** — Real-time bell notifications + notification centre
- **Public pages** — Home, About, Programs, Booking, FAQ (`/faq`), Privacy Policy (`/privacy`), Terms of Use (`/terms`)

---

## Running locally

**Prerequisites:** Node.js 20+, pnpm, Docker

```bash
# 1. Clone and install
git clone https://github.com/muddsarn8n-lgtm/quranacademy.git
cd quranacademy
pnpm install

# 2. Start Postgres
docker compose up -d postgres

# 3. Copy env template and fill in values
cp .env.example .env

# 4. Run migrations + seed demo data
pnpm db:migrate
pnpm db:seed

# 5. Start dev servers (Vite :3000, Express :4000)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo accounts (after seeding):**

| Role | Email | Password |
|---|---|---|
| Admin | admin@quranacademy.com | Admin@123! |
| Teacher | teacher@quranacademy.com | Teacher@123! |
| Student | student@quranacademy.com | Student@123! |

---

## Testing

```bash
# Requires both dev servers + DB running with seed data
pnpm test           # headless (154 Playwright E2E specs)
pnpm test:headed    # with browser visible
pnpm test:ui        # Playwright UI mode

# Clean up test-created records after a run
npx tsx scripts/cleanup-playwright-data.ts
```

---

## Deployment

See [DEPLOY.md](DEPLOY.md) for the full guide.

Every push to `main` automatically:
1. Builds and pushes a Docker image to GHCR
2. Deploys to **production** (migrations only — no seed)

The **demo site** deploys manually: Actions → 🎭 Deploy Demo Environment → Run workflow.

---

## Documentation

| File | Contents |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Codebase conventions and patterns (for AI-assisted development) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, data model, auth flow, AI pipelines |
| [DEPLOY.md](DEPLOY.md) | Full production + demo deployment guide |
