# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client — uses a placeholder URL at build time; real URL is injected at runtime
ENV DATABASE_URL=file:/tmp/build-placeholder.db
RUN npx prisma generate

# Build Next.js in standalone mode
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs && \
    mkdir -p /data && chown nextjs:nodejs /data

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/public           ./public

# Copy Prisma schema + generated client (needed at runtime for migrations)
COPY --from=builder /app/prisma           ./prisma
COPY --from=builder /app/lib/generated    ./lib/generated

USER nextjs
EXPOSE 3000

# /data is the volume mount point for the SQLite database
VOLUME ["/data"]

CMD ["node", "server.js"]
