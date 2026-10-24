# Multi-arch Production Dockerfile for AGBA (linux/amd64 & linux/arm64)
# Supports Oracle Cloud Always Free ARM (Ampere A1), Hetzner, Coolify, and x86_64 servers
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/appwrite.json ./appwrite.json
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/firestore.rules ./firestore.rules
COPY --from=builder /app/data ./data

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
