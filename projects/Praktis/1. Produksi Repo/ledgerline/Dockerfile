# Praktis (LedgerLine) — production image (Railway)
# Build: Next.js standalone + Prisma. Runtime: migrate deploy tiap boot (pola MBS).

FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

# Runtime penuh (dibutuhkan worker tsx + prisma CLI migrate; ukuran demo acceptable)
COPY --from=deps /app/package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.next/standalone ./
COPY --from=deps /app/.next/static ./.next/static
COPY --from=deps /app/public ./public
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/src ./src
COPY --from=deps /app/tsconfig.json ./tsconfig.json
COPY --from=deps /app/next.config.ts ./next.config.ts

RUN mkdir -p uploads

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$WORKER_MODE\" = \"1\" ]; then echo \"[worker] starting pipeline-worker...\"; npx tsx src/server/pipeline-worker.ts; else echo \"[web] starting Next.js server...\"; node server.js; fi"]
