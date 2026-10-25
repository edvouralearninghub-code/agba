# Multi-arch Production Dockerfile for AGBA (linux/amd64 & linux/arm64)
# Supports GitHub Actions CI, Local Docker Desktop, Oracle Cloud ARM, and Coolify
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json .npmrc* ./
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 10 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set maxsockets 10 && \
    npm install --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN mkdir -p /app/data && npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN mkdir -p /app/data

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/api ./api
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/appwrite.json ./appwrite.json
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/firestore.rules ./firestore.rules

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null 2>&1 || exit 1

CMD ["npx", "tsx", "server.ts"]
