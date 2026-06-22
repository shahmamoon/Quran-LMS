# ═══════════════════════════════════════════════════════════════
#  Build AI With Us — Production Dockerfile
#  Multi-stage: builder (full deps + Vite build) → runner (lean)
# ═══════════════════════════════════════════════════════════════

# ─── Stage 1: Builder ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm (matches the package manager used locally)
RUN npm install -g pnpm

# Install ALL deps using the frozen pnpm lockfile
# .npmrc (shamefully-hoist=true) ensures a flat node_modules layout
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# Copy everything and build the React frontend
COPY . .
RUN pnpm run build:ssg     # client build + SSR build + pre-render marketing pages → /app/dist


# ─── Stage 2: Production runner ────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy pre-built node_modules (includes tsx, prisma CLI, etc.)
COPY --from=builder /app/node_modules ./node_modules

# Copy Vite-built React app
COPY --from=builder /app/dist ./dist

# Copy Prisma schema (needed for prisma generate + migrations)
COPY prisma ./prisma

# Copy server TypeScript source (tsx executes it directly)
COPY server ./server

# Copy seed scripts (used for manual db:seed:* commands in production)
COPY scripts ./scripts

# Copy package.json + tsconfig files (tsx + prisma use them)
COPY package.json tsconfig.server.json ./

# Generate Prisma client in the runner stage.
# We do this here (not builder) to avoid pnpm symlink layout issues
# when COPYing node_modules/.prisma between stages.
RUN node_modules/.bin/prisma generate

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Create uploads directory with correct ownership before switching user
# (the named volume is mounted here at runtime, but we need the dir to exist
#  with the right owner so Docker doesn't create it as root)
RUN mkdir -p /app/uploads/lesson-attachments /app/uploads/quiz-submissions \
    && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 4000

# Health check — Docker will restart unhealthy containers
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

# tsx runs TypeScript directly — no compilation step needed
CMD ["node_modules/.bin/tsx", "server/index.ts"]
