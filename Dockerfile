# Lynceus - UPS & PDU SNMP Power Monitor & Remote Control
# Multi-stage lightweight multi-architecture production Docker build (linux/amd64, linux/arm64)

FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="Lynceus"
LABEL org.opencontainers.image.description="Lightweight, self-hosted web dashboard for real-time SNMP monitoring and remote outlet management of UPSs and PDUs."
LABEL org.opencontainers.image.source="https://github.com/spaceplant2/lynceus"
LABEL org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production
ENV PORT=3000
ENV CONFIG_DIR=/app/config

# Install production dependencies required at runtime
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/config ./config

# Expose web dashboard port
EXPOSE 3000

# Health check to ensure Express API & SNMP loop is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/telemetry || exit 1

# Persistent configuration volume
VOLUME ["/app/config"]

CMD ["npx", "tsx", "server.ts"]
