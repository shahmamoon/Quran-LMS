# Product Specifications — Online Quran Academy LMS

## Product overview

Online Quran Academy is a full-stack Learning Management System (LMS) aimed at K-12 and adult learners ("Upskill"). It combines a public marketing website with a private LMS portal covering three user roles: **Admin**, **Teacher**, and **Student**.

---

## User roles

| Role | Description |
|---|---|
| **Admin** | Full system access. Manages users, settings, content, payments, and audit logs. |
| **Teacher** | Manages their own courses, recitation sessions, and students. Can mark lessons as complete on behalf of students. |
| **Student** | Accesses enrolled courses and sessions. Views own Quran recitation progress. Cannot modify any content. |

---

## Public marketing site

| Page | Path | Description |
|---|---|---|
| Home | `/` | Hero section, feature highlights, CTA |
| About | `/about` | Team and mission |
| Programs | `/programs` | Course offerings overview |
| Book a session | `/book` | Enquiry / booking form |
| Confirmation | `/confirmation` | Post-booking confirmation page |

All public pages use a shared `Navbar` + `Footer` shell with a WhatsApp widget.

---

## LMS features

### 1. Authentication (`/lms/login`)

- Email + password login with bcrypt verification
- JWT access token (15 min, httpOnly cookie) + refresh token (7 days, httpOnly cookie)
- Auto-refresh: expired access tokens are transparently refreshed by the Axios interceptor
- Password visibility toggle
- Quick-fill demo buttons for each role (dev/demo convenience)
- Password reset via email token (SMTP, falls back to console log if SMTP not configured)

---

### 2. Dashboard (`/lms/dashboard`)

Personalised per role:

**Admin dashboard:**
- Stat cards: total users, subjects, sessions, groups
- Recent subjects list
- Quick-access links

**Teacher dashboard:**
- Welcome message with name
- Stat cards: my subjects, active sessions, student count
- Upcoming sessions list
- My subjects list

**Student dashboard:**
- Personalised greeting
- Enrolled subjects with progress bars
- Upcoming sessions
- Assigned quizzes

---

### 3. Courses (`/lms/subjects`, `/lms/subjects/:id`)

**Landing page (`/lms/subjects`):**
- Two course tiles: **Quran with Tajweed** (blue) and **Noorani Qaida** (emerald)
- Students see only courses they are enrolled in (API filters server-side)
- Staff (Admin + Teacher) always see both tiles

**Quran with Tajweed (`/lms/subjects/quran-with-tajweed`):**
- Staff: student dropdown to view any student's progress
- Stats: completed pages, worked pages, total sessions, needs-review count
- Progress bar + per-Juz mini-bars (30 Juz)
- Tabs: **Map** (604-page Mushaf grid) | **Sessions** | **Needs Review**
- Map: click any page → `QuranPageModal` with zoom, pan, row highlight, fullscreen
- Page drawer: attempt history per page with mastery scores and Tajweed errors

**Noorani Qaida (`/lms/subjects/noorani-qaida`):**
- Staff: student dropdown; students auto-use own ID
- Overall progress bar (completed / total lessons)
- Week accordion (all expanded by default) with per-week completion fraction
- Click any lesson row → image modal with CDN lesson images
- Image modal controls: zoom in/out (%), reset, fullscreen, drag-to-pan, pinch zoom, Ctrl+scroll, row highlighter (H key), prev/next between images, keyboard shortcuts
- Staff: Mark complete / Mark incomplete button per lesson (toggles on behalf of selected student)

---

### 4. Sessions (`/lms/sessions`)

- List of upcoming and past sessions as cards (title, subject, student, date, status badge, meeting link)
- **Create session form:** select subject, student (1-on-1 only), date, duration
  - Teacher: defaults to self; Admin: picks any teacher
- All sessions are **1-on-1** (no group sessions)
- Status badges: SCHEDULED / LIVE / COMPLETED / CANCELLED
- Meeting provider controlled by Settings (`zoom` / `google_meet` / `daily_co`) — only one active at a time
- Edit existing session (modal)
- Cancel session

---

### 5. Students (`/lms/students`)

_Admin + Teacher only_

- Student cards with: avatar, name, grade badge, active/inactive badge, enrolled subject pills
- Expandable row: full enrolled subjects list (with unenroll button) + group memberships
- Search by name
- **Enroll in Subject** modal:
  - Shows only subjects matching the student's grade + Upskill subjects + ungraded subjects
  - Auto-assigns teacher if subject has only one teacher; picker if multiple
- **Add to Group** modal
- Teacher view: scoped to their own students only

---

### 6. Users (`/lms/users`)

_Admin only_

- Table of all active users with role badges and grade (students)
- Search by name/email
- Filter by role
- Create user modal: first name, last name, email, password, role, grade (students), bio, phone
- Reset password
- Deactivate user (soft delete — cannot enroll deactivated users)

---

### 7. Chat (`/lms/chat`)

- Left panel: conversation list
- Right panel: message thread with send input
- Staff (Admin + Teacher): "+" button to start a new conversation
  - Student tab: pick a student to start 1-on-1 chat
  - Group tab: pick a group to open group conversation
- Students: can view and reply to existing conversations; cannot initiate
- Real-time via Socket.IO

---

### 8. Notifications (`/lms/notifications`)

- Bell icon in topbar with unread count badge (red)
- Notifications page: list of all notifications with read/unread state
- Mark single / mark all as read
- Delete notification
- Real-time delivery via Socket.IO
- System creates notifications for: session assignments; teacher can broadcast to any users

---

### 9. Settings (`/lms/settings`)

_Admin only_

- Key/value settings table (e.g. `site_name`, `contact_email`, `zoom_enabled`)
- Edit and save settings in bulk
- Public settings readable by all authenticated users via `/api/settings/public`

---

### 10. Audit Logs (`/lms/audit`)

_Admin only_

- Paginated log of all system actions: action type, resource, resource ID, user, IP address, timestamp
- Actions recorded: user create/deactivate/password-reset, settings update

---

### 11. Account (`/lms/account`)

_All authenticated users_

- View and edit profile: first name, last name, phone, bio
- Change avatar
- View account details: email, role, grade (students)

---

## Business rules

1. **Deactivated users** cannot log in and cannot be enrolled in subjects
2. **Subject grade filter** — enrollment modal only shows subjects matching the student's grade, plus "Upskill" and ungraded subjects
3. **Course visibility** — students see only enrolled courses on the Courses landing page; staff see all
4. **Lesson mark-complete** — teachers and admins only; students cannot self-certify completion
5. **Sessions** — all sessions are 1-on-1; teachers can only create sessions for subjects they teach; admin can create for any
6. **Meeting provider** — only one video platform active at a time; switched via Settings
7. **Recitation sessions** — teachers can only update/log attempts in their own sessions; ADMIN can delete empty sessions
8. **Password reset** — time-limited token; single-use
9. **File downloads** (`/uploads`) — require a valid access token; cannot be accessed anonymously

---

## Seed data (demo environment)

The seed (`prisma/seed.ts`) creates:

| Entity | Count |
|---|---|
| Admin users | 1 (admin@quranacademy.com) |
| Teacher users | 8+ |
| Student users | 6+ |
| Subjects | 42 (across all grades + Upskill) |
| Groups | 2 |
| Sessions | 8 |
| Conversations | 2 (group-linked) |

Demo passwords: `Test@1234!` for all seed users.

---

## Non-functional requirements

| Requirement | Implementation |
|---|---|
| API response consistency | `successResponse` / `errorResponse` helpers on every route |
| Input validation | Zod schemas on all POST bodies |
| Rate limiting | 500 req/15 min (production) |
| Security headers | Helmet.js |
| Audit trail | `AuditLog` table for mutations |
| Graceful AI degradation | All AI features return 503 if `DEEPSEEK_API_KEY` is not set |
| File security | Auth-gated static file serving |
| Real-time resilience | Socket push failures are caught; DB notification is the fallback |
| Test coverage | 145 Playwright E2E tests across all 15 feature areas |
