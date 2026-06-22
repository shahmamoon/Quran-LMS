# Quran Academy — System Flow Diagrams

## 1. Teacher Session Workflow

```mermaid
flowchart TD
    A([Teacher logs in]) --> B[Sessions page\n/lms/sessions]
    B --> C[Click 'New Session']
    C --> D[Pick Student\nfrom all active students]
    D --> E[Pick Course\nfiltered to student's enrollments]
    E --> F[Pick Host Teacher\n+ schedule date/time]
    F --> G[Submit → POST /api/sessions]
    G --> H{Meeting Provider}
    H -->|zoom| I[Zoom meeting created]
    H -->|google_meet| J[Google Meet link created]
    H -->|daily_co| K[Daily.co room created\nroom name stored]
    I & J & K --> L[Session card appears\non Sessions page]
    L --> M[Click 'Continue with Student']
    M --> N{Course type?}
    N -->|Noorani Qaida\nEnglish or Urdu| O[NooraniQaida page\n/lms/subjects/noorani-qaida-english\n?student=id]
    N -->|Quran with Tajweed| P[QuranProgress page\n/lms/subjects/quran-with-tajweed\n?student=id]
    O --> O1[Auto-opens first\nincomplete lesson]
    P --> P1[Auto-selects current\nworking page]
```

---

## 2. Noorani Qaida — Lesson Progress Flow

```mermaid
flowchart TD
    A[NooraniQaida page] --> B{Staff or Student?}
    B -->|Staff| C[Student picker dropdown\nGET /users?role=STUDENT]
    B -->|Student| D[Own progress loaded automatically]
    C --> E[Select student]
    E & D --> F[Load subject\nGET /subjects/noorani-qaida-english\nor noorani-qaida-urdu]
    F --> G[Load student progress\nGET /curriculum/progress/studentId]
    G --> H[Show 6 weeks\n22 lessons with completion badges]
    H --> I[Click lesson]
    I --> J[Lesson modal opens\nshows language-filtered image pages]
    J --> K[Teacher reviews with student]
    K --> L{Mark complete?}
    L -->|Yes| M[POST /curriculum/progress\ncreates LessonProgress row]
    L -->|No| N[Close modal\nstudent stays on same lesson\nnext session continues here]
    M --> O[Lesson marked ✓\nnext lesson highlighted]
```

---

## 3. Quran with Tajweed — Page Attempt Flow

```mermaid
flowchart TD
    A[QuranProgress page\n/lms/subjects/quran-with-tajweed] --> B{Staff or Student?}
    B -->|Staff| C[Student picker\nor arrive via session Continue button]
    B -->|Student| D[Own 604-page grid loads]
    C --> E[Select student]
    E & D --> F[Load 604 pages\nGET /recitation/pages]
    F --> G[Load student progress\nGET /recitation/progress/studentId\nreads student_page_progress MV]
    G --> H[MushaafGrid\n604 coloured buttons\nwhite=new sky=intro amber=practicing\nemerald=done red=needs review]
    H --> I[Teacher opens RecitationSession\nPOST /api/recitation/sessions]
    I --> J[Log page attempt\nPOST /recitation/sessions/id/attempts\nstatus + mastery score + Tajweed errors]
    J --> K[Async: refresh\nstudent_page_progress MV]
    K --> L[Grid colour updates]
    L --> M{Session done?}
    M -->|PATCH status=COMPLETED| N[MV refreshed again\nProgress summary updated]
    M -->|Continue next session| J
```

---

## 4. Deployment Flow

```mermaid
flowchart LR
    A([git push origin main]) --> B[GitHub Actions\ndeploy.yml triggered]
    B --> C[Build Docker image\nGHCR push]
    C --> D[SSH into VPS]
    D --> E[Pull new image\nfrom GHCR]
    E --> F[Doppler pulls prd secrets\nto quranacademy.env]
    F --> G[prisma migrate deploy\nforward-only, non-destructive]
    G --> H[docker compose up\n--no-deps quranacademy]
    H --> I{Health check\nGET /api/health}
    I -->|200 OK| J([quranacademy.com live])
    I -->|fail| K([Alert — deploy failed])

    style J fill:#059669,color:#fff
    style K fill:#dc2626,color:#fff
```

---

## 5. Auth & Token Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant API as Express API
    participant DB as PostgreSQL

    B->>API: POST /api/auth/login
    API->>DB: findUnique user by email
    DB-->>API: user row
    API-->>B: accessToken (in-memory) +\nrefreshToken (httpOnly cookie)

    Note over B: Page reload / new tab
    B->>API: POST /api/auth/refresh\n(cookie sent automatically)
    API->>DB: verify refreshToken hash
    DB-->>API: valid
    API-->>B: new accessToken (in-memory)

    Note over B: API call
    B->>API: GET /api/... Authorization: Bearer <accessToken>
    API->>API: verify JWT
    API->>DB: query
    DB-->>API: data
    API-->>B: response

    Note over B: 401 received
    B->>B: queryClient.clear()\n+ clearAuth()\n+ disconnectSocket()
    B->>B: redirect /lms/login
```

---

## 6. Stripe Payment Flow

```mermaid
flowchart TD
    A[Admin: Payments page] --> B[Select student + plan\nor custom amount]
    B --> C[POST /api/payments\ncreates Payment row PENDING]
    C --> D[Stripe Checkout Session created]
    D --> E[Admin emails link to student\nPOST /api/payments/id/email]
    E --> F([Student opens Stripe link])
    F --> G{One-time or Subscription?}
    G -->|One-time| H[Student pays\nStripe fires checkout.session.completed]
    G -->|Subscription| I[Student pays\nStripe creates subscription\nfires checkout.session.completed]
    H --> J[Webhook → Payment status PAID]
    I --> J
    J --> K[Student sees payment\non /lms/my-payments]
    I --> L[Monthly renewal\nStripe fires invoice.paid]
    L --> J
    I --> M[Renewal fails\nStripe fires invoice.payment_failed]
    M --> N[Payment status PAST_DUE\nStripe retries via dunning]
```
