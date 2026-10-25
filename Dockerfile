# Multi-arch Production Dockerfile for AGBA (linux/amd64 & linux/arm64)
# Supports GitHub Actions CI, Local Docker Desktop, Oracle Cloud ARM, and Coolify
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json .npmrc* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.npmrc ./
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
COPY --from=builder /app/data ./data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null 2>&1 || exit 1

CMD ["npx", "tsx", "server.ts"]
