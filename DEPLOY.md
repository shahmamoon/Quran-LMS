# 🚀 Deployment Guide — Build AI With Us LMS

## Architecture overview

```
Internet
   │
   ▼
Caddy (n8n-caddy-1)          ← SSL termination via ACME, runs on host network
   ├── buildaiwithus.com      → localhost:4000  (production)
   └── demo.buildaiwithus.com → localhost:4001  (demo)
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  n8n_default Docker network                                 │
│                                                            │
│  buildaiwithus-app  (port 127.0.0.1:4000:4000)            │
│  buildaiwithus-demo (port 127.0.0.1:4001:4000)            │
│                                                            │
│  n8n-postgres-1                                            │
│    ├── database: buildaiwithus       ← production          │
│    └── database: buildaiwithus_demo  ← demo                │
└────────────────────────────────────────────────────────────┘
```

Both environments run the **same Docker image** with different Doppler configs injected at startup.  
Secrets are managed by **Doppler** — no `.env` files on the server, no plain secrets in GitHub.

---

## Environments

| | Production | Demo |
|---|---|---|
| URL | https://buildaiwithus.com | https://demo.buildaiwithus.com |
| Container | `buildaiwithus-app` | `buildaiwithus-demo` |
| Host port | `127.0.0.1:4000:4000` | `127.0.0.1:4001:4000` |
| Database | `buildaiwithus` | `buildaiwithus_demo` |
| Doppler config | `prd` | `demo` |
| Uploads volume | `uploads_data` | `demo_uploads_data` |
| Deploy dir | `/opt/buildaiwithus` | `/opt/buildaiwithus-demo` |
| Seed on deploy | ❌ Never | ✅ Always (wipe + reseed) |
| Reset / seed manually | `seed-db.yml` workflow (wipe + create admin) | `seed-demo.yml` workflow |

---

## CI/CD (GitHub Actions)

| Workflow | File | Trigger | What it does |
|---|---|---|---|
| 🚀 Build & Deploy to Production | `deploy.yml` | push to `main` (auto) | Builds Docker image → pushes to GHCR → SSH deploys to prod → migrations only |
| 🎭 Deploy Demo Environment | `deploy-demo.yml` | **manual only** | SSH deploys to demo → migrations + **wipe + reseed** |
| 🌱 Reseed Demo Database | `seed-demo.yml` | **manual only** | Wipes and reseeds demo DB without redeploying |
| 🔄 Reset Production Database | `seed-db.yml` | **manual only** | Wipes all production data, creates single admin account |
| 📝 Seed Blog Posts | `seed-blog.yml` | **manual only** | Idempotent upsert of starter SEO blog articles on prod (non-destructive) |
| 📚 Seed AI Fundamentals | `seed-ai-fundamentals.yml` | **manual only** | Idempotent add of "AI Fundamentals" subject + 23 lessons on prod (non-destructive) |
| 🗂️ Split AI Fundamentals into Weeks | `split-ai-fundamentals.yml` | **manual only** | Splits AI Fundamentals into 12 weeks, preserving live lesson order; guarded against double-split |
| 🔎 Diagnose AI Fundamentals | `diagnose-ai-fundamentals.yml` | **manual only** | READ-ONLY dump of the subject/week/lesson structure for debugging |
| 💾 Backup Prod DB | `backup-prod-db.yml` | **daily 03:00 UTC** (+ manual) | `pg_dump` of prod DB pulled OFF the VPS → GitHub artifact (30-day retention) |

> **Important:** `deploy.yml` (push to `main`) and `backup-prod-db.yml` (daily cron) run automatically. Demo deploys, database resets, and all seed/split jobs are always manual — go to **Actions → [workflow name] → Run workflow**.

### Database backup & restore

The prod DB lives in the shared **n8n Postgres container** on the VPS, so a VPS restore/loss wipes it unless there's an off-VPS copy (this happened on 2026-06-02 and lost student data — there were no backups). `backup-prod-db.yml` now runs a daily `pg_dump`, pulls it to a **GitHub Actions artifact** (off the VPS), and keeps 30 days. ~1 MB/dump, so ~30 MB steady-state — well under the 500 MB free-tier quota, and retention auto-prunes.

**Restore from a backup:**
1. **Actions → 💾 Backup Prod DB →** open a recent run **→ Artifacts →** download `db-backup-YYYY-MM-DD` → unzip to get `buildaiwithus.sql.gz`.
2. Copy it to the VPS and import (this OVERWRITES current data — be sure):
   ```bash
   scp buildaiwithus.sql.gz user@vps:/tmp/
   ssh user@vps
   gunzip -c /tmp/buildaiwithus.sql.gz | docker exec -i n8n-postgres-1 psql -U lmsuser -d buildaiwithus
   ```
   For a clean restore into an empty DB, drop+recreate the schema first (or restore into a fresh DB name and repoint `DB_NAME`).
>
> The blog and AI Fundamentals seed/split workflows are **idempotent and non-destructive** — they upsert by slug/title and never wipe data, so they are safe to run against production.

### Recovering after a VPS restore

A Hostinger VPS restore rolls back **everything** on the server (the Postgres data, Docker volumes, the Caddyfile, and TLS certs) to the snapshot. After a restore, both sites typically go down and need this recovery (this happened on 2026-06-02):

1. **App + database** — re-run **🚀 Build & Deploy to Production** (and **🎭 Deploy Demo Environment**). The deploy runs `prisma migrate deploy` (forward-only) which re-applies any migrations the snapshot was missing. The app containers (`buildaiwithus-app`:4000 / `buildaiwithus-demo`:4001) come back healthy on their own.
   - ⚠️ **Data rows added after the snapshot are gone** — restore them from the daily DB backup (see *Database backup & restore* above). Migrations only restore the schema, not the rows.

2. **HTTPS / Caddy** — the restore wipes the per-site blocks from the Caddyfile. **Symptom:** `http://` returns the 308→https redirect fine, but `https://` fails the TLS handshake (`tlsv1 alert internal error`; `openssl s_client` shows no cert) — that means the site's Caddy block is missing. Caddy runs in container `n8n-caddy-1`.
   - **Re-add the prod block** (the demo deploy re-adds demo's block, but a deploy guard bug means **prod's is NOT auto-re-added** — see the warning below):
     ```bash
     docker exec n8n-caddy-1 sh -c 'printf "\nbuildaiwithus.com, www.buildaiwithus.com {\n    reverse_proxy localhost:4000\n    encode gzip\n}\n" >> /etc/caddy/Caddyfile'
     docker exec n8n-caddy-1 caddy reload --config /etc/caddy/Caddyfile --force
     ```
   - Caddy obtains a fresh Let's Encrypt cert within ~20 s; then `https://buildaiwithus.com/api/health` should return 200.

> ⚠️ **Known deploy bug:** `deploy.yml`'s Caddy guard runs `grep -q "buildaiwithus"` before adding the prod block — but that substring **also matches `demo.buildaiwithus.com`**, so once the demo block exists the prod deploy reports "already configured" and never re-adds `buildaiwithus.com`. Until the guard is changed to match the exact host (`^[[:space:]]*buildaiwithus\.com`), re-add the prod block manually as shown above.

---

## First-time setup (new server)

### Step 1 — VPS prerequisites

SSH into the server and ensure these are installed (run `setup-vps.yml` or manually):

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Docker Compose plugin
sudo apt install docker-compose-plugin

# Doppler CLI
curl -Ls https://cli.doppler.com/install.sh | sudo sh

# Deployment directories
sudo mkdir -p /opt/buildaiwithus /opt/buildaiwithus-demo
sudo chown $USER:$USER /opt/buildaiwithus /opt/buildaiwithus-demo
```

### Step 2 — Doppler setup

#### Production config (`prd`)
1. Log in to [doppler.com](https://doppler.com) → project `buildaiwithus` → config `prd`
2. Set all required secrets (see table below)
3. **Access tab → Generate Service Token** → name `production-deploy`, scope `prd`

#### Demo config (`demo`)
1. Fork the `prd` config → name it `demo` (this creates a new `demo` environment)
2. Override these three values:
   - `DB_NAME` → `buildaiwithus_demo`
   - `DATABASE_URL` → `postgresql://lmsuser:<DB_PASS>@n8n-postgres-1:5432/buildaiwithus_demo`
   - `CLIENT_URL` → `https://demo.buildaiwithus.com`
3. **Generate Service Token** → name `demo-deploy`, scope `demo`

#### Required secrets (both configs inherit these from `prd`)

| Secret | Example / Notes |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `CLIENT_URL` | `https://buildaiwithus.com` (override in `demo`) |
| `DB_USER` | `lmsuser` |
| `DB_PASS` | *(strong random password)* |
| `DB_NAME` | `buildaiwithus` (override in `demo`) |
| `DATABASE_URL` | `postgresql://lmsuser:<pass>@n8n-postgres-1:5432/buildaiwithus` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | `2h` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `SMTP_HOST` | `smtp.titan.email` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `noreply@buildaiwithus.com` |
| `SMTP_PASS` | *(Titan email password)* |
| `SMTP_FROM` | `Build AI With Us <noreply@buildaiwithus.com>` |
| `ZOOM_ACCOUNT_ID` | *(Zoom Server-to-Server OAuth app)* |
| `ZOOM_CLIENT_ID` | *(Zoom Marketplace)* |
| `ZOOM_CLIENT_SECRET` | *(Zoom Marketplace)* |
| `GEMINI_API_KEY` | *(Google AI Studio)* |
| `DEEPSEEK_API_KEY` | *(platform.deepseek.com)* |
| `DEMO_MODE` | *(optional) set `true` in `demo` config only — shows quick-login buttons on login page* |
| `STRIPE_SECRET_KEY` | *(optional) payments off if unset. `sk_test_…` in `demo`, `sk_live_…` in `prd`* |
| `STRIPE_WEBHOOK_SECRET` | *(optional) `whsec_…` from the Stripe webhook endpoint — per-environment (see Stripe Payments below)* |

> **Stripe Payments setup (per environment).** Payments stay OFF until both `STRIPE_*` vars are set in that environment's Doppler config.
> 1. Stripe Dashboard → **Developers → API keys** → copy the secret key (test-mode `sk_test_…` for demo, live-mode `sk_live_…` for prod).
> 2. **Developers → Webhooks → Add endpoint** (or create via API). URL = `https://<env-domain>/api/payments/webhook` (e.g. `https://demo.buildaiwithus.com/api/payments/webhook` for demo, `https://buildaiwithus.com/api/payments/webhook` for prod). Subscribe to: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `checkout.session.expired`, `payment_intent.payment_failed`.
> 3. Copy that endpoint's **signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`. Each environment has its **own** endpoint + secret.
> 4. Set both vars in the matching Doppler config (`demo` = test keys, `prd` = live keys), then redeploy that environment (Doppler is read at container start — changing a `STRIPE_*` var does **not** take effect until the environment is redeployed).
> 5. **Go-live only:** in **Settings → Billing → Automatic collections** (Live mode), enable "Send emails to customers when card payments fail". The app does not email on a failed renewal — it relies on Stripe's built-in dunning email (with an "update card" link). Without this toggle, a `PAST_DUE` is silent to the student.
>
> Local testing uses the Stripe CLI instead: `stripe listen --forward-to localhost:4000/api/payments/webhook` prints a `whsec_…` to put in local `.env`. Test card: `4242 4242 4242 4242`.

### Step 3 — DNS

| Record | Type | Value |
|---|---|---|
| `buildaiwithus.com` | A | VPS IP |
| `www.buildaiwithus.com` | A | VPS IP |
| `demo.buildaiwithus.com` | A | VPS IP |

Caddy will automatically obtain SSL certificates via ACME once DNS propagates.

### Step 4 — GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `SSH_HOST` | VPS IP address |
| `SSH_USER` | SSH username (e.g. `ubuntu`) |
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/id_rsa` |
| `SSH_PORT` | `22` (or your custom port) |
| `DOPPLER_TOKEN` | Production service token from Step 2 |
| `DOPPLER_TOKEN_DEMO` | Demo service token from Step 2 |

> `GITHUB_TOKEN` is automatically provided by GitHub — no extra secret needed for GHCR.

### Step 5 — GitHub Actions environment

Repo → **Settings → Environments → New environment** → name: `production`  
Optionally add required reviewers for deploy protection.

### Step 6 — First deploy

Push to `main` (or go to **Actions → 🚀 Build & Deploy to Production → Run workflow**).

Production will be live within ~3 minutes.

**Initialize production data (first time only):**  
Go to **Actions → 🔄 Reset Production Database → Run workflow**.  
This wipes the database and creates a single admin account (`muddsar@buildaiwithus.com`).

> ⚠️ Never run the reset workflow on a production database that already has real user data — it deletes everything.

**Deploy the demo site (first time or on demand):**  
Go to **Actions → 🎭 Deploy Demo Environment → Run workflow**.  
The demo database is always wiped and reseeded with full K-12 curriculum + demo accounts on every run.

---

## Useful commands

### Production

```bash
# Logs
docker logs buildaiwithus-app -f --tail 50

# Restart
docker restart buildaiwithus-app

# Health check
curl https://buildaiwithus.com/api/health

# Run a one-off command with prod secrets
cd /opt/buildaiwithus
DOPPLER_TOKEN=dp.st.xxxx doppler run -- \
  docker compose -f docker-compose.prod.yml run --rm app <cmd>

# Database backup
docker exec n8n-postgres-1 pg_dump -U lmsuser buildaiwithus > backup_$(date +%Y%m%d).sql
```

### Demo

```bash
# Logs
docker logs buildaiwithus-demo -f --tail 50

# Restart
docker restart buildaiwithus-demo

# Health check
curl https://demo.buildaiwithus.com/api/health

# Reseed demo DB manually (also available as seed-demo.yml workflow in GitHub Actions)
cd /opt/buildaiwithus-demo
DOPPLER_TOKEN=dp.st.xxxx doppler run -- \
  docker compose -f docker-compose.demo.yml run --rm app \
  node_modules/.bin/tsx prisma/seed.ts
```

### Caddy

```bash
# View Caddyfile
docker exec n8n-caddy-1 cat /etc/caddy/Caddyfile

# Reload after manual Caddyfile edit
docker exec n8n-caddy-1 caddy reload --config /etc/caddy/Caddyfile --force

# SSL certificate status
docker logs n8n-caddy-1 --tail 30 2>&1 | grep -E 'certificate|obtained|tls'
```

---

## Demo credentials

After the demo DB is seeded, these accounts are available at https://demo.buildaiwithus.com:

| Role | Email | Password |
|---|---|---|
| Admin | admin@buildaiwithus.com | Admin@123! |
| Teacher | teacher@buildaiwithus.com | Teacher@123! |
| Student | student@buildaiwithus.com | Student@123! |
| Teacher 2–5 | teacher2–5@buildaiwithus.com | Teacher@123! |
| Student 2–10 | student2–10@buildaiwithus.com | Student@123! |
